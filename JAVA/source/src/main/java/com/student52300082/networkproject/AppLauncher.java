package com.student52300082.networkproject;

import javax.swing.SwingUtilities;
import com.student52300082.networkproject.common.UiTheme;
import com.student52300082.networkproject.ui.MainMenuFrame;

public class AppLauncher {
    public static void main(String[] args) {
        UiTheme.install();
        SwingUtilities.invokeLater(() -> new MainMenuFrame().setVisible(true));
    }
}
