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
    implementation("org.springframework.boot:spring-boot-h2console")
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
    runtimeOnly("com.h2database:h2")
    runtimeOnly("org.postgresql:postgresql")
    annotationProcessor("org.projectlombok:lombok")
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

    // 테스트는 실제 비밀값 없이 스프링 컨텍스트만 뜨면 된다. src/test/resources 에
    // application.properties 를 두면 메인 것을 가려버려서(classpath 에서 이름당 하나만 잡힌다)
    // 나머지 설정이 통째로 사라진다 — 그래서 환경변수로만 덮는다.
    environment("MIRELAB_JWT_SECRET", "test-only-secret-at-least-32-bytes-long!!")
    environment("MIRELAB_INTERNAL_SECRET", "test-only-internal-secret")
    environment("GOOGLE_CLIENT_ID", "test-client-id")
    environment("GOOGLE_CLIENT_SECRET", "test-client-secret")
}

// 로컬 실행(./gradlew bootRun)에서만 dev 프로필을 명시적으로 켠다 — DevDataSeeder 는
// 이걸 켜야만 도는 opt-in 이라, 패키징된 jar 를 그냥 실행하는 배포 환경은 아무것도
// 안 켜져서 안전하다(운영은 SPRING_PROFILES_ACTIVE 를 따로 정하지 않는 한 시딩 안 함).
tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    systemProperty("spring.profiles.active", "dev")
}
