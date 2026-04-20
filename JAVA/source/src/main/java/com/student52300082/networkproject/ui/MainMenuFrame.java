package com.student52300082.networkproject.ui;

import com.student52300082.networkproject.chat.tcp.TcpChatClientFrame;
import com.student52300082.networkproject.chat.tcp.TcpChatServerFrame;
import com.student52300082.networkproject.chat.udp.UdpChatClientFrame;
import com.student52300082.networkproject.chat.udp.UdpChatServerFrame;
import com.student52300082.networkproject.common.UiTheme;
import com.student52300082.networkproject.extension.quiz.QuizClientFrame;
import com.student52300082.networkproject.extension.quiz.QuizServerFrame;
import com.student52300082.networkproject.file.tcp.TcpFileClientFrame;
import com.student52300082.networkproject.file.tcp.TcpFileServerFrame;
import com.student52300082.networkproject.file.udp.UdpFileReceiverFrame;
import com.student52300082.networkproject.file.udp.UdpFileSenderFrame;
import com.student52300082.networkproject.realtime.RealtimeCommClientFrame;
import com.student52300082.networkproject.realtime.RealtimeCommServerFrame;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.GridLayout;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;

public class MainMenuFrame extends JFrame {
    public MainMenuFrame() {
        UiTheme.prepareFrame(this);
        setTitle(AppConfig.APP_TITLE + " - Main Menu");
        setSize(940, 720);
        setMinimumSize(new Dimension(880, 660));
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

        JPanel page = UiTheme.page(18, 22, 22, 22);
        page.add(UiTheme.gradientHeader(
            "Java Socket Programming Project",
            "TCP, UDP, file transfer, quiz assessment and realtime communication demos"
        ), BorderLayout.NORTH);

        JPanel grid = new JPanel(new GridLayout(3, 2, 16, 16));
        grid.setBackground(UiTheme.BACKGROUND);
        grid.add(moduleCard(
            "TCP Chat",
            "Reliable stream chat. Start server first, then open one or more clients.",
            "Server",
            "Client",
            () -> new TcpChatServerFrame().setVisible(true),
            () -> new TcpChatClientFrame().setVisible(true)
        ));
        grid.add(moduleCard(
            "UDP Chat",
            "Datagram chat with join, exit and broadcast message handling.",
            "Server",
            "Client",
            () -> new UdpChatServerFrame().setVisible(true),
            () -> new UdpChatClientFrame().setVisible(true)
        ));
        grid.add(moduleCard(
            "TCP File Transfer",
            "Send file name, size and binary stream over a TCP connection.",
            "Receiver",
            "Sender",
            () -> new TcpFileServerFrame().setVisible(true),
            () -> new TcpFileClientFrame().setVisible(true)
        ));
        grid.add(moduleCard(
            "UDP File Transfer",
            "UDP chunks with stop-and-wait ACK and retry for reliable transfer behavior.",
            "Receiver",
            "Sender",
            () -> new UdpFileReceiverFrame().setVisible(true),
            () -> new UdpFileSenderFrame().setVisible(true)
        ));
        grid.add(moduleCard(
            "Quiz Assessment",
            "Server sends questions, client answers, and server calculates the final score.",
            "Server",
            "Client",
            () -> new QuizServerFrame().setVisible(true),
            () -> new QuizClientFrame().setVisible(true)
        ));
        grid.add(moduleCard(
            "Realtime Communication",
            "Live chat, group chat, private voice call and group call in one module.",
            "Server",
            "Client",
            () -> new RealtimeCommServerFrame().setVisible(true),
            () -> new RealtimeCommClientFrame().setVisible(true)
        ));

        page.add(grid, BorderLayout.CENTER);
        setContentPane(page);
    }

    private JPanel moduleCard(String title, String description, String firstButtonText, String secondButtonText,
                              Runnable firstAction, Runnable secondAction) {
        JPanel card = UiTheme.card();

        JPanel textPanel = new JPanel(new BorderLayout(4, 4));
        textPanel.setBackground(UiTheme.SURFACE);
        textPanel.add(UiTheme.title(title), BorderLayout.NORTH);
        JLabel descriptionLabel = UiTheme.subtitle("<html>" + description + "</html>");
        textPanel.add(descriptionLabel, BorderLayout.CENTER);
        card.add(textPanel, BorderLayout.CENTER);

        JPanel actions = new JPanel(new GridLayout(1, 2, 8, 0));
        actions.setBackground(UiTheme.SURFACE);
        JButton firstButton = UiTheme.primaryButton(firstButtonText);
        JButton secondButton = UiTheme.secondaryButton(secondButtonText);
        firstButton.addActionListener(e -> firstAction.run());
        secondButton.addActionListener(e -> secondAction.run());
        actions.add(firstButton);
        actions.add(secondButton);
        card.add(actions, BorderLayout.SOUTH);

        return card;
    }
}
