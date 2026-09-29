# microbit-ai-project2 GitHub Pages 배포 계획

작성일: 2026-09-29  
상태: 배포 전  
대상: `WBmaker2/microbit-ai-project2` 공개 저장소, `main` 브랜치, GitHub Pages Actions 배포

## 사전 확인

- 현재 폴더는 Git 저장소가 아니며 `WBmaker2/microbit-ai-project2` 원격 저장소는 아직 없다.
- GitHub CLI는 `WBmaker2` 계정으로 인증돼 있다.
- Vite `base`는 `/microbit-ai-project2/`로 설정돼 있다.
- 1편의 Pages 워크플로와 `.gitignore`를 참고한다. `node_modules/`, `dist/`, 로컬 파일을 첫 커밋에서 제외한다.

## 순서

1. `.gitignore`와 `.github/workflows/deploy.yml`을 준비한다. 워크플로는 `npm ci` → test → lint → build → Pages artifact 업로드 → 배포 순서로 실행한다.
2. 배포 전 로컬 test/lint/build를 다시 확인한다. 추적 대상 파일에 의도하지 않은 생성물이나 비밀 정보가 없는지 확인한다.
3. Git을 초기화하고 `main`에서 첫 커밋을 만든다. 공개 GitHub 저장소를 생성해 `origin`에 연결하고 `main`을 푸시한다.
4. Pages 소스를 GitHub Actions로 설정한다. Actions 실행과 Pages 배포가 성공할 때까지 상태를 확인한다.
5. 공개 주소 `https://wbmaker2.github.io/microbit-ai-project2/`의 HTTP, HTML, JS/CSS 파일을 확인하고 실제 브라우저에서 Home과 AI 자세 인식 화면을 연다. 모델 주소 확인과 320/375/1280px 가로 넘침도 점검한다.
6. 최종 보고에 저장소, 전체 커밋 SHA, Actions 실행 결과, 공개 배포 링크, 실제 장치 검증 범위를 명확히 적는다.

## 완료 기준

공개 저장소의 `main`에 현재 앱과 문서가 올라가고, Pages 작업이 성공하며, 공개 페이지에서 모델 입력과 두 화면이 정상 표시된다. 실제 micro:bit 수신과 LED·알림음은 별도의 하드웨어 검증이다.
