package com.mtsguerra.archiversal;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;

/** The settings that keep errors from leaking internals, and the app from growing doors it does not use. */
@SpringBootTest(properties = "archiversal.data-location=classpath:data/test-buildings.json")
class SecurityConfigTest {

    @Autowired
    Environment env;

    @Test
    void errorResponsesNeverCarryInternals() {
        assertThat(env.getProperty("server.error.include-stacktrace")).isEqualTo("never");
        assertThat(env.getProperty("server.error.include-exception")).isEqualTo("false");
        assertThat(env.getProperty("server.error.include-message")).isEqualTo("never");
        assertThat(env.getProperty("server.error.include-binding-errors")).isEqualTo("never");
        assertThat(env.getProperty("server.error.whitelabel.enabled")).isEqualTo("false");
    }

    @Test
    void noManagementEndpointsAreExposed() {
        assertThat(env.getProperty("management.endpoints.web.exposure.include")).isNull();
    }
}
