package com.merchshop.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import com.merchshop.common.ApiException;

class GoogleTokenVerifierTest {

    @Test
    void sinClientIdElModuloQuedaDeshabilitado() {
        GoogleTokenVerifier verifier = new GoogleTokenVerifier("");

        assertThat(verifier.isEnabled()).isFalse();
        assertThatThrownBy(() -> verifier.verify("id-token"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus())
                        .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }

    @Test
    void conClientIdSeConstruyeElVerificador() {
        GoogleTokenVerifier verifier = new GoogleTokenVerifier("123-abc.apps.googleusercontent.com");

        assertThat(verifier.isEnabled()).isTrue();
    }
}
