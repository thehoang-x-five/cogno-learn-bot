package com.student52300082.networkproject.realtime;

public final class RealtimeProtocol {
    public static final String HELLO = "HELLO";
    public static final String WELCOME = "WELCOME";
    public static final String SYSTEM_MESSAGE = "SYSTEM_MESSAGE";
    public static final String ERROR = "ERROR";
    public static final String USER_LIST = "USER_LIST";
    public static final String ROOM_LIST = "ROOM_LIST";
    public static final String JOIN_ROOM = "JOIN_ROOM";
    public static final String LEAVE_ROOM = "LEAVE_ROOM";
    public static final String ROOM_JOINED = "ROOM_JOINED";
    public static final String ROOM_LEFT = "ROOM_LEFT";
    public static final String DIRECT_MESSAGE = "DIRECT_MESSAGE";
    public static final String ROOM_MESSAGE = "ROOM_MESSAGE";
    public static final String PRIVATE_CALL_START = "PRIVATE_CALL_START";
    public static final String PRIVATE_VIDEO_CALL_START = "PRIVATE_VIDEO_CALL_START";
    public static final String GROUP_CALL_START = "GROUP_CALL_START";
    public static final String CALL_STARTED = "CALL_STARTED";
    public static final String CALL_END = "CALL_END";
    public static final String CALL_ENDED = "CALL_ENDED";
    public static final String AUDIO_FRAME = "AUDIO_FRAME";
    public static final String VIDEO_FRAME = "VIDEO_FRAME";

    public static final String CALL_MODE_PRIVATE = "PRIVATE";
    public static final String CALL_MODE_PRIVATE_VIDEO = "PRIVATE_VIDEO";
    public static final String CALL_MODE_GROUP = "GROUP";
    public static final String CALL_MODE_NONE = "NONE";

    public static final float AUDIO_SAMPLE_RATE = 16000.0f;
    public static final int AUDIO_SAMPLE_SIZE_BITS = 16;
    public static final int AUDIO_CHANNELS = 1;
    public static final int AUDIO_FRAME_SIZE = 2048;
    public static final int VIDEO_MAX_FRAME_BYTES = 220_000;
    public static final int VIDEO_FRAME_INTERVAL_MS = 220;

    private RealtimeProtocol() {
    }
}
