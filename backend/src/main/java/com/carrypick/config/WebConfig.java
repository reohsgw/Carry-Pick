package com.carrypick.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Uploaded files are served by {@link com.carrypick.web.UploadController}. */
@Configuration
public class WebConfig implements WebMvcConfigurer {
}
