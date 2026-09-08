# CertiChain — Seed Login Credentials

Dev/demo logins for the seeded data. **Plaintext** here; the DB stores bcrypt hashes.
Do not use these values or this file outside local demo. See `SEED-DATA.md` for the full data record.

## Accreditation Authority

| Email | Password |
|---|---|
| `
` | `aa-dev-password` |

## Institutions

All institution passwords: **`Certi@2026`**

| # | Institution | Login email | Status |
|---|---|---|---|
| 1 | Yangon Technological University | `registrar@ytu.edu.mm` | APPROVED |
| 2 | University of Information Technology, Yangon | `registrar@uit.edu.mm` | APPROVED |
| 3 | University of Yangon | `registrar@uy.edu.mm` | APPROVED |
| 4 | Mandalay Technological University | `registrar@mtu.edu.mm` | APPROVED |
| 5 | Yangon University of Economics | `registrar@yueco.edu.mm` | APPROVED |
| 6 | University of Medicine 1, Yangon | `registrar@um1.edu.mm` | APPROVED |
| 7 | Myanmar Institute of Information Technology (MIIT), Mandalay | `registrar@miit.edu.mm` | SUSPENDED |
| 8 | Co-operative University, Thanlyin | `registrar@cutl.edu.mm` | PENDING |
| 9 | Yangon Global Business Academy | `admin@ygba.example` | REJECTED |
| 10 | KMD College (KMD Education Services) | `registrar@kmd.edu.mm` | APPROVED |
| 11 | MCC.i (Myanmar Computer Company Institute) | `registrar@mcc.com.mm` | APPROVED |
| 12 | Strategy First International College | `registrar@strategyfirst.edu.mm` | APPROVED |
| 13 | Info Myanmar University | `registrar@imu.edu.mm` | APPROVED |
| 14 | Victoria University College | `registrar@vuc.edu.mm` | APPROVED |
| 15 | Auston College Myanmar | `registrar@auston.edu.mm` | SUSPENDED |
| 16 | GUSTO College | `registrar@gusto.edu.mm` | APPROVED |
| 17 | SkillBridge Yangon Bootcamp | `admin@skillbridge.example` | PENDING |
| 18 | MIT — Professional Education | `credentials@mitpe.example` | APPROVED |
| 19 | Stanford Center for Professional Development | `credentials@scpd.example` | APPROVED |
| 20 | Harvard Extension School | `credentials@extension.harvard.example` | APPROVED |
| 21 | NUS — School of Continuing and Lifelong Education | `credentials@scale.nus.example` | APPROVED |
| 22 | Coursera | `credentials@coursera.example` | APPROVED |
| 23 | edX (2U/edX) | `credentials@edx.example` | APPROVED |
| 24 | Udacity | `credentials@udacity.example` | APPROVED |
| 25 | DataCamp | `credentials@datacamp.example` | APPROVED |
| 26 | Google Career Certificates | `credentials@grow.google.example` | APPROVED |
| 27 | CertHub Online | `admin@certhub.example` | REJECTED |

## Graduates

All graduate passwords: **`Certi@2026`**. 50 in the main roster (`#13–#15` are unregistered —
sign up with those emails to demo claim-on-signup), plus **#51** `sunandmoon8484984@gmail.com`
(UIT student, seeded via `seed-extra-graduate.sh`). Full roster with phones + institution
links: `scripts/seed/graduates.tsv`. Which credential each graduate holds:
`scripts/seed/credential-assignments.tsv` (249 rows).

| # | Name | Email | Registered |
|---|------|-------|:---:|
| 1 | Aung Kaung Myat | `aung.kaungmyat@demo.mm` | ✓ |
| 2 | Su Myat Noe | `sumyat.noe@demo.mm` | ✓ |
| 3 | Kyaw Zin Hein | `kyawzin.hein@demo.mm` | ✓ |
| 4 | Ei Ei Phyo | `eiei.phyo@demo.mm` | ✓ |
| 5 | Thant Zin Oo | `thantzin.oo@demo.mm` | ✓ |
| 6 | Hnin Wai Wai Aung | `hninwai.aung@demo.mm` | ✓ |
| 7 | Zaw Lin Htet | `zawlin.htet@demo.mm` | ✓ |
| 8 | Nway Oo Wai | `nwayoo.wai@demo.mm` | ✓ |
| 9 | Hein Htet Aung | `heinhtet.aung@demo.mm` | ✓ |
| 10 | May Thu Kyaw | `maythu.kyaw@demo.mm` | ✓ |
| 11 | Phyo Wai Yan | `phyowai.yan@demo.mm` | ✓ |
| 12 | Khin Sandar Win | `khinsandar.win@demo.mm` | ✓ |
| 13 | Wai Yan Min | `waiyan.min@demo.mm` | — (pending claim) |
| 14 | Thiri Kyaw | `thiri.kyaw@demo.mm` | — (pending claim) |
| 15 | Ko Ko Naing | `koko.naing@demo.mm` | — (pending claim) |
| 16 | Myo Min Thu | `myomin.thu@demo.mm` | ✓ |
| 17 | Shwe Yi Aung | `shweyi.aung@demo.mm` | ✓ |
| 18 | Nyein Chan Ko | `nyeinchan.ko@demo.mm` | ✓ |
| 19 | Htet Aung Kyaw | `htetaung.kyaw@demo.mm` | ✓ |
| 20 | Yamin Htwe | `yamin.htwe@demo.mm` | ✓ |
| 21 | Pyae Sone Aung | `pyaesone.aung@demo.mm` | ✓ |
| 22 | Chit Su Wai | `chitsu.wai@demo.mm` | ✓ |
| 23 | Kaung Sett Naing | `kaungsett.naing@demo.mm` | ✓ |
| 24 | Ei Thandar Kyaw | `eithandar.kyaw@demo.mm` | ✓ |
| 25 | Zin Mar Aung | `zinmar.aung@demo.mm` | ✓ |
| 26 | Thura Zaw | `thura.zaw@demo.mm` | ✓ |
| 27 | Hsu Myat Mon | `hsumyat.mon@demo.mm` | ✓ |
| 28 | Aung Myo Thant | `aungmyo.thant@demo.mm` | ✓ |
| 29 | Nandar Hlaing | `nandar.hlaing@demo.mm` | ✓ |
| 30 | Kyaw Swar Lin | `kyawswar.lin@demo.mm` | ✓ |
| 31 | Moe Moe Khaing | `moemoe.khaing@demo.mm` | ✓ |
| 32 | Sithu Aung | `sithu.aung@demo.mm` | ✓ |
| 33 | Phoo Pwint Han | `phoopwint.han@demo.mm` | ✓ |
| 34 | Wunna Kyaw | `wunna.kyaw@demo.mm` | ✓ |
| 35 | Hnin Ei Hlaing | `hninei.hlaing@demo.mm` | ✓ |
| 36 | Kaung Khant Zaw | `kaungkhant.zaw@demo.mm` | ✓ |
| 37 | Su Su Hlaing | `susu.hlaing@demo.mm` | ✓ |
| 38 | Ye Yint Aung | `yeyint.aung@demo.mm` | ✓ |
| 39 | Thet Hnin Wai | `thethnin.wai@demo.mm` | ✓ |
| 40 | Aye Chan Moe | `ayechan.moe@demo.mm` | ✓ |
| 41 | Zwe Htet Naing | `zwehtet.naing@demo.mm` | ✓ |
| 42 | Nway Nway Oo | `nwaynway.oo@demo.mm` | ✓ |
| 43 | Kyi Phyu Sin | `kyiphyu.sin@demo.mm` | ✓ |
| 44 | Min Khant Kyaw | `minkhant.kyaw@demo.mm` | ✓ |
| 45 | Htoo Myat Noe | `htoomyat.noe@demo.mm` | ✓ |
| 46 | Lin Let Aung | `linlet.aung@demo.mm` | ✓ |
| 47 | Paing Soe Htun | `paingsoe.htun@demo.mm` | ✓ |
| 48 | Shoon Lae Wai | `shoonlae.wai@demo.mm` | ✓ |
| 49 | Aung Zaw Oo | `aungzaw.oo@demo.mm` | ✓ |
| 50 | Thin Zar Nwe | `thinzar.nwe@demo.mm` | ✓ |
| 51 | Sun Moon | `sunandmoon8484984@gmail.com` | ✓ (UIT student — UIT degrees + activities + 6 MOOC certs) |
