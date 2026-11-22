package com.merchshop.catalog;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRepository extends JpaRepository<Game, Long> {

    List<Game> findByActiveTrueOrderByDisplayOrderAsc();

    Optional<Game> findBySlug(String slug);
}
