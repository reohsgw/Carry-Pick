package com.carrypick.domain;

/** Product categories. Snacks were merged into Food, so old "Snacks" values are read as Food. */
public final class Categories {
    private Categories() {}

    public static String normalize(String category) {
        if (category == null) return null;
        return "Snacks".equalsIgnoreCase(category.trim()) ? "Food" : category;
    }
}
