package com.certichain.certichainbackend.institution;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pure parsing test - parseCsv is static and takes a String, so there's no Spring context,
 * no MultipartFile and no mocking needed.
 */
class BatchCsvParseTest {

    @Test
    void parsesHeaderAndRows() {
        List<Map<String, String>> rows = InstitutionServiceImpl.parseCsv("""
                graduate_email,degree,gpa
                alice@example.com,BSc Computer Science,3.9
                bob@example.com,BSc Physics,3.4
                """);

        assertEquals(2, rows.size());
        assertEquals("alice@example.com", rows.getFirst().get("graduate_email"));
        assertEquals("BSc Computer Science", rows.getFirst().get("degree"));
        assertEquals("3.4", rows.get(1).get("gpa"));
    }

    @Test
    void stripsExcelBomFromFirstHeader() {
        // Excel writes a UTF-8 BOM. Without stripping it the first column name is
        // "﻿graduate_email" and every row looks like it's missing an email.
        List<Map<String, String>> rows = InstitutionServiceImpl.parseCsv(
                "﻿graduate_email,degree\nalice@example.com,BSc\n");

        assertEquals("alice@example.com", rows.getFirst().get("graduate_email"));
    }

    @Test
    void rowMissingEmailStillParsesSoItCanBeReportedPerRow() {
        // The parser must not throw on a bad row - issueBatch turns a blank email into a
        // row-level error, which only works if parsing hands the row over intact.
        List<Map<String, String>> rows = InstitutionServiceImpl.parseCsv("""
                graduate_email,degree
                alice@example.com,BSc
                ,BSc Physics
                carol@example.com,BEng
                """);

        assertEquals(3, rows.size());
        assertTrue(rows.get(1).get("graduate_email").isBlank());
        assertEquals("carol@example.com", rows.get(2).get("graduate_email"));
    }

    @Test
    void blankAndEmptyInputAreNotErrors() {
        assertTrue(InstitutionServiceImpl.parseCsv("").isEmpty());
        assertTrue(InstitutionServiceImpl.parseCsv("graduate_email,degree\n").isEmpty());
    }

    @Test
    void shortRowPadsMissingTrailingColumns() {
        List<Map<String, String>> rows = InstitutionServiceImpl.parseCsv(
                "graduate_email,degree,gpa\nalice@example.com,BSc\n");

        assertEquals("", rows.getFirst().get("gpa"));
    }
}
