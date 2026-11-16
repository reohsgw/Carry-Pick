package com.carrypick.service;

import java.time.LocalDate;
import java.time.ZoneId;

public final class Today {
    public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    private Today() {}

    public static LocalDate get() {
        return LocalDate.now(ZONE);
    }
}
