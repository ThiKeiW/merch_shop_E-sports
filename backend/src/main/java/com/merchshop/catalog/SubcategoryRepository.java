package com.merchshop.catalog;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SubcategoryRepository extends JpaRepository<Subcategory, Long> {

    List<Subcategory> findByCategoryIdOrderByDisplayOrderAsc(Long categoryId);

    List<Subcategory> findByActiveTrueOrderByDisplayOrderAsc();
}
