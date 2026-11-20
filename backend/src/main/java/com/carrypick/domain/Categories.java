package com.carrypick.domain;

public final class Categories {
    private Categories() {}

    public static String normalize(String category) {
        if (category == null) return null;
        return "Snacks".equalsIgnoreCase(category.trim()) ? "Food" : category;
    }
}
