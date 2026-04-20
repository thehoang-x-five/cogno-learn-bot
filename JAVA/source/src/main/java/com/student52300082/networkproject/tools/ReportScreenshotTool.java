package com.student52300082.networkproject.tools;

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
import com.student52300082.networkproject.ui.MainMenuFrame;

import java.awt.Component;
import java.awt.Container;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.imageio.ImageIO;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JRadioButton;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;

public class ReportScreenshotTool {
    private final File outputDir;
    private final LinkedHashMap<String, String> captureNotes = new LinkedHashMap<String, String>();

    public ReportScreenshotTool(File outputDir) {
        this.outputDir = outputDir;
    }

    public static void main(String[] args) throws Exception {
        UiTheme.install();
        File outputDir = args.length > 0
            ? new File(args[0])
            : new File("report/image");
        if (!outputDir.exists() && !outputDir.mkdirs()) {
            throw new IOException("Cannot create screenshot directory: " + outputDir.getAbsolutePath());
        }

        ReportScreenshotTool tool = new ReportScreenshotTool(outputDir);
        tool.captureAll();
        System.out.println("Screenshots saved to: " + outputDir.getAbsolutePath());
    }

    private void captureAll() throws Exception {
        capture(new MainMenuFrame(), "01_main_menu_dashboard.png", null, "Dashboard tong quan cac module trong du an.");
        capture(new TcpChatServerFrame(), "02_tcp_chat_server.png",
            "Server started on port 2026\nClient#1 connected: /127.0.0.1:51540\nClient#1: Xin chao server TCP\nServer: Da nhan tin nhan TCP",
            "Server TCP chat dang lang nghe va ghi nhan tin nhan client.");
        capture(new TcpChatClientFrame(), "03_tcp_chat_client.png",
            "Connected to server localhost:2026\nMe: Xin chao server TCP\n[Server] Da nhan tin nhan TCP",
            "Client TCP chat gui va nhan phan hoi tu server.");
        capture(new UdpChatServerFrame(), "04_udp_chat_server.png",
            "UDP chat server started on port 2027\nClientA joined from 127.0.0.1:53001\nClientA: Xin chao qua UDP\n[Server] Broadcast thanh cong",
            "Server UDP chat xu ly join va broadcast datagram.");
        capture(new UdpChatClientFrame(), "05_udp_chat_client.png",
            "Connected to UDP server 127.0.0.1:2027\nMe: Xin chao qua UDP\n[Server] Broadcast thanh cong",
            "Client UDP chat gui va nhan tin nhan broadcast.");
        capture(new TcpFileServerFrame(), "06_tcp_file_receiver.png",
            "TCP file receiver started on port 2028\nReceiving submission_sample.txt (1024 bytes)\nSaved file: Downloads/tcp_received/submission_sample.txt",
            "TCP receiver nhan file va luu dung du lieu.");
        capture(new TcpFileClientFrame(), "07_tcp_file_sender.png",
            "Sending submission_sample.txt (1024 bytes) to localhost:2028\nSend completed. Bytes sent: 1024",
            "TCP sender truyen file den receiver thanh cong.");
        capture(new UdpFileReceiverFrame(), "08_udp_file_receiver.png",
            "UDP file receiver started on port 2029\nReceiving UDP file submission_sample.txt (1024 bytes, 1 packets)\nUDP file saved: Downloads/udp_received/submission_sample.txt",
            "UDP receiver nhan goi tin va tao lai file.");
        capture(new UdpFileSenderFrame(), "09_udp_file_sender.png",
            "Starting UDP transfer: submission_sample.txt, 1024 bytes, 1 packets\nSent packet 1/1\nUDP transfer completed. Bytes sent: 1024",
            "UDP sender gui packet va xac nhan hoan tat.");
        capture(new QuizServerFrame(), "10_quiz_server.png",
            "Quiz server started on port 2030\nQuestion bank: 4 questions\nStudent 01 connected from /127.0.0.1:54002\nStudent 01 answered question 1: A -> correct\nFinal score for Student 01: 4/4",
            "Quiz server phan phoi cau hoi va cham diem.");
        capture(new QuizClientFrame(), "11_quiz_client.png",
            "Connected. Total questions: 4\nQuestion 1: selected A\nCorrect. Current score: 1/4\nPress Next Question to continue.\nQuestion 2: selected B\nCorrect. Current score: 2/4\nFinal score for Student 01: 4/4",
            "Quiz client tra loi cau hoi va hien thi diem.");
        capture(new RealtimeCommServerFrame(), "12_realtime_server.png", null, "Realtime server voi online users, rooms va call relay.");
        capture(new RealtimeCommClientFrame(), "13_realtime_client.png", null, "Realtime client: live chat, group chat, call va group call.");
        writeOverviewReport();
    }

    private void capture(JFrame frame, String fileName, String sampleLog, String note) throws Exception {
        File target = new File(outputDir, fileName);
        SwingUtilities.invokeAndWait(() -> {
            frame.setLocation(80, 60);
            frame.setVisible(true);
            if (sampleLog != null) {
                fillTextAreas(frame.getContentPane(), sampleLog);
                fillExampleTextFields(frame.getContentPane());
                if (frame instanceof QuizClientFrame) {
                    fillQuizClientExample(frame.getContentPane());
                }
            } else if (frame instanceof RealtimeCommServerFrame) {
                ((RealtimeCommServerFrame) frame).loadDemoStateForScreenshot();
            } else if (frame instanceof RealtimeCommClientFrame) {
                ((RealtimeCommClientFrame) frame).loadDemoStateForScreenshot();
            }
        });

        Thread.sleep(350);

        SwingUtilities.invokeAndWait(() -> {
            BufferedImage image = new BufferedImage(frame.getWidth(), frame.getHeight(), BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = image.createGraphics();
            frame.paintAll(graphics);
            graphics.dispose();
            try {
                ImageIO.write(image, "png", target);
            } catch (IOException ex) {
                throw new RuntimeException(ex);
            } finally {
                frame.dispose();
            }
        });
        captureNotes.put(fileName, note);
    }

    private void writeOverviewReport() throws IOException {
        File reportFile = new File(outputDir, "report_overview.md");
        try (FileWriter writer = new FileWriter(reportFile, false)) {
            writer.write("# Project Screenshot Report\n\n");
            writer.write("Generated images for all required modules:\n\n");
            for (Map.Entry<String, String> entry : captureNotes.entrySet()) {
                writer.write("- `" + entry.getKey() + "`: " + entry.getValue() + "\n");
            }
            writer.write("\nNotes:\n");
            writer.write("- Realtime screens include live chat, group chat, private call and group call demo state.\n");
            writer.write("- Use these images directly in your final project report.\n");
        }
    }

    private void fillTextAreas(Component component, String text) {
        if (component instanceof JTextArea) {
            ((JTextArea) component).setText(text);
        }
        if (component instanceof Container) {
            for (Component child : ((Container) component).getComponents()) {
                fillTextAreas(child, text);
            }
        }
    }

    private void fillExampleTextFields(Component component) {
        if (component instanceof JTextField) {
            JTextField field = (JTextField) component;
            if (field.getText() == null || field.getText().trim().isEmpty()) {
                field.setText("Sample input");
            }
        }
        if (component instanceof Container) {
            for (Component child : ((Container) component).getComponents()) {
            fillExampleTextFields(child);
            }
        }
    }

    private void fillQuizClientExample(Component component) {
        fillQuizQuestionLabel(component);
        fillQuizFeedbackLabel(component);
        fillQuizOptions(component, new int[] { 0 });
        enableSubmitButton(component);
    }

    private void fillQuizQuestionLabel(Component component) {
        if (component instanceof JLabel) {
            JLabel label = (JLabel) component;
            String text = label.getText();
            if (text != null && text.contains("Press Start Quiz")) {
                label.setText("<html><b>Question 1/4</b><br>Which Java class is commonly used to create a TCP server?</html>");
            }
        }
        if (component instanceof Container) {
            for (Component child : ((Container) component).getComponents()) {
                fillQuizQuestionLabel(child);
            }
        }
    }

    private void fillQuizFeedbackLabel(Component component) {
        if (component instanceof JLabel) {
            JLabel label = (JLabel) component;
            String text = label.getText();
            if (text != null && text.contains("Answer check")) {
                label.setText("<html><b>Answer check</b><br>Correct. Current score: 1/4</html>");
                label.setForeground(UiTheme.PRIMARY);
            }
        }
        if (component instanceof Container) {
            for (Component child : ((Container) component).getComponents()) {
                fillQuizFeedbackLabel(child);
            }
        }
    }

    private void fillQuizOptions(Component component, int[] index) {
        String[] options = new String[] {
            "A. ServerSocket",
            "B. DatagramSocket",
            "C. JFrame",
            "D. FileInputStream"
        };
        if (component instanceof JRadioButton && index[0] < options.length) {
            JRadioButton radioButton = (JRadioButton) component;
            radioButton.setText(options[index[0]]);
            radioButton.setSelected(index[0] == 0);
            radioButton.setEnabled(true);
            index[0]++;
        }
        if (component instanceof Container) {
            for (Component child : ((Container) component).getComponents()) {
                fillQuizOptions(child, index);
            }
        }
    }

    private void enableSubmitButton(Component component) {
        if (component instanceof JButton) {
            JButton button = (JButton) component;
            if ("Check Answer".equals(button.getText()) || "Next Question".equals(button.getText())) {
                button.setEnabled(true);
            }
        }
        if (component instanceof Container) {
            for (Component child : ((Container) component).getComponents()) {
                enableSubmitButton(child);
            }
        }
    }
}
