package com.certichain.certichainbackend.institution;

import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class BulkIssuanceVigorousTest {

    @Test
    void quotedCommaInFieldParsesCorrectly() {
        List<Map<String, String>> rows = InstitutionServiceImpl.parseCsv("""
                graduate_email,degree,graduationDate
                alice@test.local,"BSc, Chemistry",2026-06-01
                """);
        assertEquals(1, rows.size());
        assertEquals("BSc, Chemistry", rows.get(0).get("degree"));
    }

    @Test
    void quotedEscapedQuote() {
        List<Map<String, String>> rows = InstitutionServiceImpl.parseCsv("""
                graduate_email,degree
                alice@test.local,"BSc ""Honours"" Chemistry"
                """);
        assertEquals("BSc \"Honours\" Chemistry", rows.get(0).get("degree"));
    }

    @Test
    void bomStripped() {
        List<Map<String, String>> rows = InstitutionServiceImpl.parseCsv("\uFEFFgraduate_email,degree\nalice@test.local,BSc\n");
        assertEquals("alice@test.local", rows.get(0).get("graduate_email"));
    }

    @Test
    void perRowTypeAndExpiryColumnsAreParsed() {
        // mirrors .audit/bulk-issuance-test.csv edge rows
        List<Map<String, String>> rows = InstitutionServiceImpl.parseCsv("""
                graduate_email,type,degree,graduationDate,expires_at
                alice@test.local,certificate,BSc,2026-06-01,
                carol@test.local,activity_record,President,2026-01-10,2026-12-31
                erik@test.local,bogus_type,BSc,2026-06-01,
                fiona@test.local,certificate,BSc,2026-06-01,not-a-date
                """);
        assertEquals(4, rows.size());
        assertEquals("certificate", rows.get(0).get("type"));
        assertEquals("activity_record", rows.get(1).get("type"));
        assertEquals("bogus_type", rows.get(2).get("type"));
        assertEquals("not-a-date", rows.get(3).get("expires_at"));
        assertEquals("", rows.get(0).get("expires_at"));
    }

    @Test
    void largeFileOver5000Throws() {
        StringBuilder sb = new StringBuilder("graduate_email,degree\n");
        for (int i = 0; i < 5001; i++) sb.append("a@test.local,BSc\n");
        assertThrows(com.certichain.certichainbackend.common.exception.ValidationException.class,
                () -> InstitutionServiceImpl.parseCsv(sb.toString()));
    }

    @Test
    void emptyRowsNotCounted() {
        List<Map<String, String>> rows = InstitutionServiceImpl.parseCsv("graduate_email,degree\n\n   \nalice@test.local,BSc\n");
        assertEquals(1, rows.size());
    }
}
