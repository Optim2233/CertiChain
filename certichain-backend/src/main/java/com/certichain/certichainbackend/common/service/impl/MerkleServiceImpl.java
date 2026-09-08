package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.service.DisclosureProof;
import com.certichain.certichainbackend.common.service.Field;
import com.certichain.certichainbackend.common.service.MerkleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MerkleServiceImpl implements MerkleService {

    private final CredentialFieldRepository credentialFieldRepository;

    @Override
    public String computeRoot(List<Field> fields) {
        List<String> leaves = new ArrayList<>();
        for (Field f : fields) {
            leaves.add(hashLeaf(f.name(), f.value()));
        }
        return buildTree(leaves).getLast().getFirst();
    }

    /**
     * @deprecated No prod caller (verifier uses {@code computeRoot} on already-decrypted
     * lists, signing uses {@code computeRoot(plaintext)}). Do not resurrect without
     * decrypting via {@code CredentialFieldCryptoService} first - raw
     * {@code fieldValue} here is Base64 ciphertext since V22.
     */
    @Deprecated
    @Override
    public DisclosureProof generateProof(UUID credentialId, List<UUID> selectedFieldIds) {
        // Load the FULL leaf set, ordered by merkleIndex - the proof needs every
        // sibling hash along the path, not just the disclosed leaves.
        List<CredentialField> allFields =
                credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credentialId);

        List<String> leafHashes = allFields.stream()
                .map(f -> hashLeaf(f.getFieldName(), f.getFieldValue()))
                .toList();

        List<List<String>> tree = buildTree(leafHashes);
        String root = tree.getLast().getFirst();

        Set<UUID> selected = Set.copyOf(selectedFieldIds);
        List<DisclosureProof.DisclosedField> disclosed = new ArrayList<>();
        List<DisclosureProof.ProofStep> proofPath = new ArrayList<>();

        for (CredentialField field : allFields) {
            if (!selected.contains(field.getId())) {
                continue;
            }
            disclosed.add(new DisclosureProof.DisclosedField(
                    field.getFieldName(), field.getFieldValue(), field.getMerkleIndex()));
            proofPath.addAll(pathForLeaf(tree, field.getMerkleIndex()));
        }

        return new DisclosureProof(root, disclosed, proofPath);
    }

    @Override
    public boolean verifyDisclosure(String expectedRoot, DisclosureProof proof) {
        for (DisclosureProof.DisclosedField field : proof.disclosedFields()) {
            String hash = hashLeaf(field.fieldName(), field.fieldValue());
            for (DisclosureProof.ProofStep step : proof.proofPath()) {
                hash = step.isLeft()
                        ? sha256Hex(step.siblingHash() + hash)
                        : sha256Hex(hash + step.siblingHash());
            }
            if (!hash.equals(expectedRoot)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Bottom-up build: leaves -> pairwise SHA-256(left+right) -> ... -> root.
     * An odd node count at any level duplicates the last node before pairing
     * (Bitcoin-style), so every level pairs cleanly going up.
     * Returns every level, leaves first, root last (as a single-element list).
     */
    List<List<String>> buildTree(List<String> leafHashesInMerkleIndexOrder) {
        List<List<String>> levels = new ArrayList<>();
        List<String> current = new ArrayList<>(leafHashesInMerkleIndexOrder);
        if (current.isEmpty()) {
            current.add(hashLeaf("", ""));
        }
        levels.add(current);

        while (current.size() > 1) {
            List<String> next = new ArrayList<>();
            List<String> level = current.size() % 2 == 0
                    ? current
                    : append(current, current.getLast());
            for (int i = 0; i < level.size(); i += 2) {
                next.add(sha256Hex(level.get(i) + level.get(i + 1)));
            }
            levels.add(next);
            current = next;
        }
        return levels;
    }

    private List<DisclosureProof.ProofStep> pathForLeaf(List<List<String>> tree, int leafIndex) {
        List<DisclosureProof.ProofStep> steps = new ArrayList<>();
        int index = leafIndex;
        for (int level = 0; level < tree.size() - 1; level++) {
            List<String> nodes = tree.get(level);
            List<String> paddedNodes = nodes.size() % 2 == 0 ? nodes : append(nodes, nodes.getLast());
            boolean isRightNode = index % 2 == 1;
            int siblingIndex = isRightNode ? index - 1 : index + 1;
            steps.add(new DisclosureProof.ProofStep(paddedNodes.get(siblingIndex), isRightNode));
            index = index / 2;
        }
        return steps;
    }

    private List<String> append(List<String> list, String value) {
        List<String> copy = new ArrayList<>(list);
        copy.add(value);
        return copy;
    }

    private String hashLeaf(String fieldName, String fieldValue) {
        return sha256Hex(fieldName + "|" + fieldValue);
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
