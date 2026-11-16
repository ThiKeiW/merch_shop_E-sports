package com.merchshop.security;

import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import com.merchshop.user.Role;
import com.merchshop.user.User;

@Service
public class JwtService {

    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final String issuer;
    private final Duration ttl;

    public JwtService(JwtEncoder encoder,
                      JwtDecoder decoder,
                      @Value("${app.security.jwt.issuer}") String issuer,
                      @Value("${app.security.jwt.ttl}") Duration ttl) {
        this.encoder = encoder;
        this.decoder = decoder;
        this.issuer = issuer;
        this.ttl = ttl;
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .subject(String.valueOf(user.getId()))
                .claim("email", user.getEmail())
                .claim("name", user.getDisplayName())
                .claim("role", user.getRole().name())
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    /**
     * Valida firma, emisor y expiración. Lanza {@link org.springframework.security.oauth2.jwt.JwtException}
     * si el token no es válido.
     */
    public AuthenticatedUser parseToken(String token) {
        Jwt jwt = decoder.decode(token);
        return new AuthenticatedUser(
                Long.valueOf(jwt.getSubject()),
                jwt.getClaimAsString("email"),
                jwt.getClaimAsString("name"),
                Role.valueOf(jwt.getClaimAsString("role")));
    }

    public long expiresInSeconds() {
        return ttl.toSeconds();
    }
}
