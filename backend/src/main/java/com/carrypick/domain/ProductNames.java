package com.carrypick.domain;

import java.text.Normalizer;
import java.util.Locale;

public final class ProductNames {
    private ProductNames() {}

    public static String normalize(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
        StringBuilder out = new StringBuilder(n.length());
        n.codePoints().filter(Character::isLetterOrDigit).forEach(out::appendCodePoint);
        return out.toString();
    }
}
