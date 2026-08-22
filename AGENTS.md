# Project notes

- The Mirelab backend runs in Docker. Run backend Gradle commands and tests inside the running
  `backend` Compose service (for example, `docker compose -f docker-compose.dev.yml exec backend
  ./gradlew test`) instead of invoking host Gradle.
