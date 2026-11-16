package com.merchshop.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "categories")
@Getter
@NoArgsConstructor
public class Category {

    @Id
    private Long id;

    @Column(nullable = false, length = 80)
    private String slug;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(nullable = false)
    private boolean active;
}
