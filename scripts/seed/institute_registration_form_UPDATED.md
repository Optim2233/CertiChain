{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["institutionType", "institutionName", "contactEmail"],
  "properties": {
    "applicationMeta": {
      "type": "object",
      "properties": {
        "submissionDate": { "type": "string", "format": "date" },
        "applicationStatus": {
          "type": "string",
          "enum": ["draft", "submitted", "underReview", "approved", "rejected", "provisional"]
        },
        "reviewNotes": { "type": "string" },
        "reviewedBy": { "type": "string" },
        "reviewedDate": { "type": "string", "format": "date" }
      }
    },
    "institutionType": {
      "type": "string",
      "enum": ["private", "public"],
      "description": "Determines which section of the form is applicable"
    },
    "institutionName": {
      "type": "string",
      "description": "Official full name of the institution"
    },
    "institutionNameMyanmar": {
      "type": "string",
      "description": "Official name in Myanmar language"
    },
    "institutionCategory": {
      "type": "string",
      "enum": ["university", "college", "degreeCollege", "institute", "center"],
      "description": "Type of higher education institution"
    },
    "contactEmail": {
      "type": "string",
      "format": "email"
    },
    "contactPhone": {
      "type": "string"
    },
    "website": {
      "type": "string",
      "format": "uri"
    },
    "address": {
      "type": "object",
      "properties": {
        "stateRegion": { "type": "string" },
        "district": { "type": "string" },
        "township": { "type": "string" },
        "ward": { "type": "string" },
        "street": { "type": "string" },
        "postalCode": { "type": "string" }
      }
    },
    "privateInstitutionData": {
      "type": "object",
      "description": "ONLY required if institutionType = 'private'",
      "properties": {
        "founderInformation": {
          "type": "array",
          "description": "List of founders/investors",
          "items": {
            "type": "object",
            "properties": {
              "fullName": { "type": "string" },
              "fullNameMyanmar": { "type": "string" },
              "nationality": { "type": "string" },
              "race": { "type": "string" },
              "religion": { "type": "string" },
              "nrcOrPassport": { "type": "string" },
              "dateOfBirth": { "type": "string", "format": "date" },
              "educationalQualification": { "type": "string" },
              "currentAddress": { "type": "string" },
              "permanentAddress": { "type": "string" },
              "phone": { "type": "string" },
              "email": { "type": "string", "format": "email" }
            }
          }
        },
        "administratorInformation": {
          "type": "object",
          "properties": {
            "fullName": { "type": "string" },
            "fullNameMyanmar": { "type": "string" },
            "nationality": { "type": "string" },
            "race": { "type": "string" },
            "religion": { "type": "string" },
            "nrcOrPassport": { "type": "string" },
            "dateOfBirth": { "type": "string", "format": "date" },
            "educationalQualification": { "type": "string" },
            "currentAddress": { "type": "string" },
            "permanentAddress": { "type": "string" },
            "phone": { "type": "string" },
            "email": { "type": "string", "format": "email" }
          }
        },
        "businessRegistration": {
          "type": "object",
          "properties": {
            "companyName": { "type": "string" },
            "dicaCertificateNumber": { "type": "string" },
            "mycoRegistrationNumber": { "type": "string" },
            "tinNumber": { "type": "string" },
            "incorporationDate": { "type": "string", "format": "date" },
            "ownershipStructure": { "type": "string" },
            "investmentAmount": { "type": "number" },
            "foreignInvolvement": { "type": "boolean" },
            "micPermitNumber": { "type": "string" }
          }
        },
        "identityDocuments": {
          "type": "object",
          "description": "Documents that prove the legal identity of the institution",
          "properties": {
            "dicaCertificate": {
              "type": "object",
              "description": "Certificate of Incorporation from DICA - primary legal identity document",
              "properties": {
                "fileName": { "type": "string" },
                "fileUrl": { "type": "string", "format": "uri" },
                "fileSize": { "type": "number" },
                "uploadDate": { "type": "string", "format": "date" },
                "status": { "type": "string", "enum": ["pending", "uploaded", "verified", "rejected"] }
              }
            },
            "micPermit": {
              "type": "object",
              "description": "MIC Permit - required only if foreign investment is involved",
              "properties": {
                "fileName": { "type": "string" },
                "fileUrl": { "type": "string", "format": "uri" },
                "fileSize": { "type": "number" },
                "uploadDate": { "type": "string", "format": "date" },
                "status": { "type": "string", "enum": ["pending", "uploaded", "verified", "rejected"] }
              }
            },
            "taxClearance": {
              "type": "object",
              "description": "Taxpayer evidence / TIN registration",
              "properties": {
                "fileName": { "type": "string" },
                "fileUrl": { "type": "string", "format": "uri" },
                "fileSize": { "type": "number" },
                "uploadDate": { "type": "string", "format": "date" },
                "status": { "type": "string", "enum": ["pending", "uploaded", "verified", "rejected"] }
              }
            }
          }
        },
        "registrationStatus": {
          "type": "object",
          "properties": {
            "certificateNumber": { "type": "string" },
            "certificateType": {
              "type": "string",
              "enum": ["permanent", "provisional"]
            },
            "certificateIssueDate": { "type": "string", "format": "date" },
            "certificateExpiryDate": { "type": "string", "format": "date" },
            "provisionalUpgradeDeadline": {
              "type": "string",
              "format": "date",
              "description": "If provisional, deadline to meet full requirements (2 years from issue)"
            },
            "annualFeePaid": { "type": "boolean" },
            "annualFeePaidDate": { "type": "string", "format": "date" }
          }
        },
        "branchLocations": {
          "type": "array",
          "description": "Each branch requires separate registration",
          "items": {
            "type": "object",
            "properties": {
              "branchName": { "type": "string" },
              "address": { "type": "string" },
              "registrationCertificateNumber": { "type": "string" }
            }
          }
        }
      }
    },
    "publicInstitutionData": {
      "type": "object",
      "description": "ONLY required if institutionType = 'public'",
      "properties": {
        "governingMinistry": {
          "type": "string",
          "enum": [
            "Ministry of Education",
            "Ministry of Science and Technology",
            "Ministry of Health",
            "Ministry of Defence",
            "Ministry of Religious Affairs"
          ]
        },
        "establishmentDocument": {
          "type": "object",
          "description": "The law, act, order, or decree that legally establishes the public institution",
          "properties": {
            "documentType": {
              "type": "string",
              "enum": ["establishmentLaw", "establishmentAct", "governmentOrder", "governmentDecree", "subDecree"]
            },
            "documentTitle": {
              "type": "string",
              "description": "Official title of the document (e.g., 'University of Culture Law')"
            },
            "referenceNumber": {
              "type": "string",
              "description": "Official reference number (e.g., 'The State Law and Order Restoration Council Law No. 7/93', 'Order No. 36/96')"
            },
            "issueDate": { "type": "string", "format": "date" },
            "fileUpload": {
              "type": "object",
              "properties": {
                "fileName": { "type": "string" },
                "fileUrl": { "type": "string", "format": "uri" },
                "fileSize": { "type": "number" },
                "uploadDate": { "type": "string", "format": "date" },
                "status": { "type": "string", "enum": ["pending", "uploaded", "verified", "rejected"] }
              }
            }
          }
        },
        "yearEstablished": { "type": "number" }
      }
    }
  }
}

{
  "applicationMeta": {
    "submissionDate": "2026-09-02",
    "applicationStatus": "submitted"
  },
  "institutionType": "private",
  "institutionName": "Yangon International University",
  "institutionNameMyanmar": "ရန်ကုန်အပြည်ပြည်ဆိုင်ရာတက္ကသိုလ်",
  "institutionCategory": "university",
  "contactEmail": "registrar@yiu.edu.mm",
  "contactPhone": "+95-1-2345678",
  "website": "https://www.yiu.edu.mm",
  "address": {
    "stateRegion": "Yangon",
    "district": "Kamayut",
    "township": "Kamayut",
    "ward": "1",
    "street": "Pyay Road",
    "postalCode": "11041"
  },
  "privateInstitutionData": {
    "founderInformation": [
      {
        "fullName": "Aung Ko",
        "fullNameMyanmar": "အောင်ကို",
        "nationality": "Myanmar",
        "race": "Bamar",
        "religion": "Buddhist",
        "nrcOrPassport": "12/NAMA(N)123456",
        "dateOfBirth": "1975-03-15",
        "educationalQualification": "Ph.D.",
        "currentAddress": "45 Golden Valley Road, Yangon",
        "permanentAddress": "45 Golden Valley Road, Yangon",
        "phone": "+95-9-12345678",
        "email": "aung.ko@investor.mm"
      }
    ],
    "administratorInformation": {
      "fullName": "San San Win",
      "fullNameMyanmar": "စန်းစန်းဝင်း",
      "nationality": "Myanmar",
      "race": "Bamar",
      "religion": "Buddhist",
      "nrcOrPassport": "13/YGN(M)789012",
      "dateOfBirth": "1980-06-20",
      "educationalQualification": "M.Ed.",
      "currentAddress": "78 University Avenue, Yangon",
      "permanentAddress": "78 University Avenue, Yangon",
      "phone": "+95-9-87654321",
      "email": "san.win@yiu.edu.mm"
    },
    "businessRegistration": {
      "companyName": "Yangon International University Co., Ltd.",
      "dicaCertificateNumber": "DICA-2025-34567",
      "mycoRegistrationNumber": "MYCO-2025-98765",
      "tinNumber": "TIN-1234567890",
      "incorporationDate": "2025-06-15",
      "ownershipStructure": "Private Limited Company",
      "investmentAmount": 5000000000,
      "foreignInvolvement": false,
      "micPermitNumber": null
    },
    "identityDocuments": {
      "dicaCertificate": {
        "fileName": "DICA_Certificate_2026_YIU.pdf",
        "fileUrl": "https://storage.example.com/uploads/2026/09/dica_yiu_001.pdf",
        "fileSize": 2450000,
        "uploadDate": "2026-09-02",
        "status": "uploaded"
      },
      "taxClearance": {
        "fileName": "Tax_Clearance_YIU_2026.pdf",
        "fileUrl": "https://storage.example.com/uploads/2026/09/tax_yiu_002.pdf",
        "fileSize": 1200000,
        "uploadDate": "2026-09-02",
        "status": "uploaded"
      }
    },
    "registrationStatus": {
      "certificateNumber": "PEL-REG-2026-00045",
      "certificateType": "permanent",
      "certificateIssueDate": "2026-01-15",
      "certificateExpiryDate": "2031-01-14",
      "provisionalUpgradeDeadline": null,
      "annualFeePaid": true,
      "annualFeePaidDate": "2026-01-15"
    },
    "branchLocations": []
  }
}
{
  "applicationMeta": {
    "submissionDate": "2026-09-02",
    "applicationStatus": "submitted"
  },
  "institutionType": "public",
  "institutionName": "Mandalay University",
  "institutionNameMyanmar": "မန္တလေးတက္ကသိုလ်",
  "institutionCategory": "university",
  "contactEmail": "rector@mandalayuniversity.edu.mm",
  "contactPhone": "+95-2-12345",
  "website": "https://www.mandalayuniversity.edu.mm",
  "address": {
    "stateRegion": "Mandalay",
    "district": "Mandalay",
    "township": "Chanmyathazi",
    "ward": "2",
    "street": "University Road",
    "postalCode": "05011"
  },
  "publicInstitutionData": {
    "governingMinistry": "Ministry of Education",
    "establishmentDocument": {
      "documentType": "establishmentLaw",
      "documentTitle": "Mandalay University Establishment Law",
      "referenceNumber": "The State Law and Order Restoration Council Law No. 15/94",
      "issueDate": "1994-03-01",
      "fileUpload": {
        "fileName": "Law_No_15_94_Mandalay_University.pdf",
        "fileUrl": "https://storage.example.com/uploads/2026/09/mandalay_law_15_94.pdf",
        "fileSize": 3200000,
        "uploadDate": "2026-09-02",
        "status": "uploaded"
      }
    },
    "yearEstablished": 1994
  }
}