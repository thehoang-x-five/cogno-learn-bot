package com.student52300082.networkproject.realtime;

import com.student52300082.networkproject.common.AppConfig;
import com.student52300082.networkproject.common.UiTheme;
import javax.swing.SwingUtilities;

public final class RealtimeTwoClientDemoLauncher {
    private RealtimeTwoClientDemoLauncher() {
    }

    public static void main(String[] args) {
        UiTheme.install();
        SwingUtilities.invokeLater(() -> {
            RealtimeCommServerFrame serverFrame = new RealtimeCommServerFrame();
            serverFrame.setLocation(40, 40);
            serverFrame.setVisible(true);
            serverFrame.startServerForDemo(AppConfig.DEFAULT_REALTIME_PORT);

            RealtimeCommClientFrame clientA = new RealtimeCommClientFrame();
            clientA.setVisible(true);
            clientA.connectForDemo(AppConfig.DEFAULT_HOST, AppConfig.DEFAULT_REALTIME_PORT, "Van", 1040, 40);

            RealtimeCommClientFrame clientB = new RealtimeCommClientFrame();
            clientB.setVisible(true);
            clientB.connectForDemo(AppConfig.DEFAULT_HOST, AppConfig.DEFAULT_REALTIME_PORT, "Linh", 1040, 460);
        });
    }
}
