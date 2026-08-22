# syntax=docker/dockerfile:1
FROM eclipse-temurin:25-jdk AS base
WORKDIR /app
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle.kts settings.gradle.kts ./
RUN chmod +x gradlew

# dev: 소스는 docker-compose.dev.yml이 /app에 bind mount, 여기선 실행만 한다.
# 호스트 사용자(uid 1000)로 실행해야, 컨테이너가 bind mount 안에 만드는 build/ 산출물이
# 호스트에서도 내 파일로 남는다 — root로 돌리면 호스트에서 못 지우는 파일이 생긴다.
FROM base AS dev
ENV GRADLE_USER_HOME=/gradle-cache
# 프로필 사진 디렉터리를 이미지 안에 미리 만들어 둔다 — 도커는 named volume 을 처음 붙일 때
# 이미지 쪽 경로의 내용과 소유권을 그대로 복사한다. 없는 채로 두면 volume 이 root 소유로
# 생겨서, uid 1000 으로 도는 이 컨테이너가 사진을 못 쓴다.
RUN mkdir -p "$GRADLE_USER_HOME" /var/mirelab/profile-pictures \
    && chown -R 1000:1000 "$GRADLE_USER_HOME" /app /var/mirelab/profile-pictures
USER 1000:1000
EXPOSE 8080
CMD ["./gradlew", "bootRun", "--no-daemon"]

# builder: prod용 jar 빌드 전용
FROM base AS builder
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# prod: JRE만 있는 슬림 런타임, jar만 복사해서 실행
FROM eclipse-temurin:25-jre AS prod
RUN useradd --system --create-home --uid 1000 spring
# dev 와 같은 이유 — volume 이 이 소유권을 물려받아야 사진을 쓸 수 있다
RUN mkdir -p /var/mirelab/profile-pictures && chown spring:spring /var/mirelab/profile-pictures
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
USER spring
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
