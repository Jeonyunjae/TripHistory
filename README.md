# 희주 윤재 두번째 여행 — 홍콩

둘만 쓰는 여행 웹페이지. 3D 미니어처 지도 + 일정 노선도 + 장소별 메모·사진·할 일.
기록은 노션 「기록」 데이터베이스에 저장되고, 노션 앱에서도 같이 보입니다.

## 구조

```
index.html          빌드된 웹페이지 (tools/build.py 가 src/ 로 만듦)
src/template.html   화면·3D 엔진 소스
src/data.json       일정 데이터
geo/                홍콩 지형 데이터
api/                Vercel 서버 함수 (의존성 없음, Node 20+)
  login.js          비밀번호 확인 → 로그인 쿠키
  me.js             로그인 상태 확인
  records.js        메모·할 일·사진 기록 목록/추가/수정/삭제 (노션 DB 행)
  photo.js          사진 업로드(노션 파일 업로드) / 사진 보기(만료되는 노션 주소를 매번 새로 받아 넘김)
```

## 환경 변수 (Vercel → Settings → Environment Variables)

| 이름 | 값 |
|---|---|
| `NOTION_TOKEN` | 노션 연동(Integration)의 내부 토큰 |
| `NOTION_DATA_SOURCE_ID` | 노션 「기록」 DB의 데이터 소스 ID |
| `APP_PASSWORD` | 둘만 아는 비밀번호 |
| `SESSION_SECRET` | 아무 긴 임의 문자열 (로그인 쿠키 서명용) |
| `TRIP_KEY` | `hongkong-2026` (여행 구분용, 기본값) |

토큰과 비밀번호는 절대 코드에 넣지 않습니다.

## 노션 「기록」 DB 속성

제목(제목) · 종류(선택: 메모/할 일/사진) · 여행(선택) · 장소ID(텍스트) · 장소(텍스트) · 일차(숫자) · 내용(텍스트) · 완료(체크박스) · 작성자(선택: 윤재/희주) · 사진(파일)

노션 연동이 이 DB에 접근하려면, DB(또는 상위 「홍콩 여행」 페이지) 오른쪽 위 ··· → 연결(Connections)에서 연동을 추가해야 합니다.

## 제한

- 노션 무료 요금제는 API 업로드가 파일당 5MB. 웹에서 올릴 때 긴 변 1600px JPEG로 자동 축소합니다.
- 노션 API는 초당 약 3회 제한이라 서버가 목록을 10초 캐시하고, 화면은 20초마다 새로 받습니다.

## 수정 후 다시 만들기

```
python3 tools/build.py   # src/ → index.html
git commit -am "..." && git push   # Vercel이 자동 배포
```
