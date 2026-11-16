package com.merchshop.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "games")
@Getter
@NoArgsConstructor
public class Game {

    @Id
    private Long id;

    @Column(nullable = false, length = 60)
    private String slug;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "accent_color", nullable = false, length = 7)
    private String accentColor;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(nullable = false)
    private boolean active;
}
