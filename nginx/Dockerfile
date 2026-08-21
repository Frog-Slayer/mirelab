# syntax=docker/dockerfile:1
# 프론트(mirelab-frontend)와 완전히 분리된 독립 서비스 — 정적 파일은 빌드타임에
# 안 담고, frontend-build 서비스가 만든 공유 볼륨을 런타임에 읽기 전용으로 마운트한다
# (docker-compose.yml 참고). 그래서 이 이미지 자체는 순수 nginx + 설정뿐이다.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
