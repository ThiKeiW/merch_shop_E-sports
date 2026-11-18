package com.merchshop.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "product_images")
@Getter
@Setter
@NoArgsConstructor
public class ProductImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "source_url", length = 700)
    private String sourceUrl;

    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath;

    @Column(nullable = false, length = 10)
    private String kind;

    private Integer width;

    private Integer height;

    @Column(nullable = false, length = 10)
    private String format;

    @Column(name = "is_primary", nullable = false)
    private boolean primary;
}
