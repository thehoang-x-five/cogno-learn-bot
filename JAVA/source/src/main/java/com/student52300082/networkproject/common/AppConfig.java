package com.student52300082.networkproject.common;

public final class AppConfig {
    public static final String APP_TITLE = "Java Socket Programming Project";
    public static final String DEFAULT_HOST = "localhost";
    public static final int DEFAULT_TCP_CHAT_PORT = 2026;
    public static final int DEFAULT_UDP_CHAT_PORT = 2027;
    public static final int DEFAULT_TCP_FILE_PORT = 2028;
    public static final int DEFAULT_UDP_FILE_PORT = 2029;
    public static final int DEFAULT_QUIZ_PORT = 2030;
    public static final int DEFAULT_REALTIME_PORT = 2031;
    public static final int FILE_BUFFER_SIZE = 4096;
    public static final int UDP_FILE_CHUNK_SIZE = 4096;
    public static final int UDP_TIMEOUT_MILLIS = 1500;
    public static final int UDP_MAX_RETRY = 10;

    private AppConfig() {
    }
}
