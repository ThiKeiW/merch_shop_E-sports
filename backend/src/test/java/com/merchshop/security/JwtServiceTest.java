package com.merchshop.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import com.merchshop.user.Role;
import com.merchshop.user.User;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

class JwtServiceTest {

    private static final String ISSUER = "merch-shop";
    private static final SecretKey KEY = new SecretKeySpec(
            "test-secret-para-pruebas-unitarias-1234567890".getBytes(StandardCharsets.UTF_8), "HmacSHA256");

    private NimbusJwtEncoder encoder;
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        encoder = new NimbusJwtEncoder(new ImmutableSecret<>(KEY));
        jwtService = buildService(Duration.ofHours(1));
    }

    @Test
    void generaYValidaElTokenConLosDatosDelUsuario() {
        User user = new User("admin@merchshop.dev", "hash", "Admin Demo");
        user.setId(7L);
        user.setRole(Role.ADMIN);

        String token = jwtService.generateToken(user);
        AuthenticatedUser parsed = jwtService.parseToken(token);

        assertThat(token).isNotBlank();
        assertThat(parsed.id()).isEqualTo(7L);
        assertThat(parsed.email()).isEqualTo("admin@merchshop.dev");
        assertThat(parsed.displayName()).isEqualTo("Admin Demo");
        assertThat(parsed.role()).isEqualTo(Role.ADMIN);
    }

    @Test
    void rechazaTokensManipulados() {
        User user = new User("cliente@merchshop.dev", "hash", "Cliente");
        user.setId(9L);
        String token = jwtService.generateToken(user);
        String tampered = token.substring(0, token.length() - 2) + "aa";

        assertThatThrownBy(() -> jwtService.parseToken(tampered))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void rechazaTokensExpirados() {
        Instant issuedAt = Instant.now().minus(Duration.ofHours(3));
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .issuedAt(issuedAt)
                .expiresAt(issuedAt.plus(Duration.ofHours(1)))
                .subject("11")
                .claim("email", "cliente@merchshop.dev")
                .claim("name", "Cliente")
                .claim("role", "CUSTOMER")
                .build();

        String expiredToken = encoder
                .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();

        assertThatThrownBy(() -> jwtService.parseToken(expiredToken))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void rechazaTokensDeOtroEmisor() {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("otro-servicio")
                .issuedAt(now)
                .expiresAt(now.plus(Duration.ofHours(1)))
                .subject("12")
                .claim("email", "cliente@merchshop.dev")
                .claim("name", "Cliente")
                .claim("role", "CUSTOMER")
                .build();

        String foreignToken = encoder
                .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();

        assertThatThrownBy(() -> jwtService.parseToken(foreignToken))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void exponeLaVigenciaEnSegundos() {
        assertThat(jwtService.expiresInSeconds()).isEqualTo(3600);
    }

    private JwtService buildService(Duration ttl) {
        var decoder = NimbusJwtDecoder.withSecretKey(KEY).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(ISSUER));
        return new JwtService(new NimbusJwtEncoder(new ImmutableSecret<>(KEY)), decoder, ISSUER, ttl);
    }
}
