plugins {
    kotlin("jvm") version "2.3.21"
    kotlin("plugin.spring") version "2.3.21"
    id("org.springframework.boot") version "4.1.0"
    id("io.spring.dependency-management") version "1.1.7"
    kotlin("plugin.jpa") version "2.3.21"
    kotlin("plugin.lombok") version "2.3.21"
}

group = "com"
version = "0.0.1-SNAPSHOT"
description = "mirelab-backend"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-jdbc")
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-security")
    // oauth2-client 는 spring-security-oauth2-jose 를 끌고 온다 — access token 서명·검증에
    // 쓰는 JwtEncoder/JwtDecoder(Nimbus 구현)가 여기 들어있어서 JWT 라이브러리를 따로 안 넣는다.
    // (jjwt 는 Jackson 2 를 끌고 오는데 이 프로젝트는 Jackson 3(tools.jackson) 을 쓴다)
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("tools.jackson.module:jackson-module-kotlin")
    compileOnly("org.projectlombok:lombok")
    runtimeOnly("org.postgresql:postgresql")
    annotationProcessor("org.projectlombok:lombok")
    // 운영/개발 런타임은 Postgres 컨테이너를 쓰지만, 테스트는 Docker 없이도 돌아가야
    // 하니 가벼운 임베디드 H2로만 남겨둔다 (src/test/resources/application.properties).
    testRuntimeOnly("com.h2database:h2")
    testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
    testImplementation("org.springframework.boot:spring-boot-starter-jdbc-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testCompileOnly("org.projectlombok:lombok")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    testAnnotationProcessor("org.projectlombok:lombok")
    testImplementation(kotlin("test"))
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
    }
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> {
    useJUnitPlatform()
    // 테스트용 설정값은 src/test/resources/application.properties 에 모아둔다 (그 파일 머리말 참고)
    // backend 컨테이너의 Postgres 환경변수가 application.properties 보다 우선한다. 테스트
    // 프로세스에는 H2 값을 명시해 Docker 안에서 실행해도 운영 DB를 건드리지 않게 한다.
    environment("SPRING_DATASOURCE_URL", "jdbc:h2:mem:mirelab-test;DB_CLOSE_DELAY=-1")
    environment("SPRING_DATASOURCE_USERNAME", "sa")
    environment("SPRING_DATASOURCE_PASSWORD", "")
}

// 로컬 실행(./gradlew bootRun)에서만 dev 프로필을 명시적으로 켠다 — DevDataSeeder 는
// 이걸 켜야만 도는 opt-in 이라, 패키징된 jar 를 그냥 실행하는 배포 환경은 아무것도
// 안 켜져서 안전하다(운영은 SPRING_PROFILES_ACTIVE 를 따로 정하지 않는 한 시딩 안 함).
tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    systemProperty("spring.profiles.active", "dev")
}
