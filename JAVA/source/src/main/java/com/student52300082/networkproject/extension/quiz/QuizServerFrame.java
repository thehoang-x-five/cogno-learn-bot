package com.student52300082.networkproject.extension.quiz;

import com.student52300082.networkproject.common.AppConfig;
import com.student52300082.networkproject.common.UiTheme;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Locale;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;

public class QuizServerFrame extends JFrame {
    private static final QuizQuestion[] QUESTIONS = new QuizQuestion[] {
        new QuizQuestion(
            "Which Java class is commonly used to create a TCP server?",
            "ServerSocket", "DatagramSocket", "JFrame", "FileInputStream", "A"
        ),
        new QuizQuestion(
            "Which protocol does not guarantee delivery by itself?",
            "TCP", "UDP", "HTTP", "SMTP", "B"
        ),
        new QuizQuestion(
            "Which method is safe for updating Swing UI from a worker thread?",
            "Thread.sleep", "System.exit", "SwingUtilities.invokeLater", "Socket.close", "C"
        ),
        new QuizQuestion(
            "Which information should be sent before file bytes in a simple transfer protocol?",
            "Only local path", "Only current time", "Only port number", "File name and file size", "D"
        )
    };

    private final JTextField txtPort = new JTextField(String.valueOf(AppConfig.DEFAULT_QUIZ_PORT), 6);
    private final JTextArea logArea = new JTextArea();

    private ServerSocket serverSocket;
    private volatile boolean running;

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new QuizServerFrame().setVisible(true));
    }

    public QuizServerFrame() {
        UiTheme.prepareFrame(this);
        setTitle("Quiz Client-Server - Server");
        setSize(760, 520);
        setMinimumSize(new Dimension(700, 460));
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);

        JPanel page = UiTheme.page(16, 18, 18, 18);
        page.add(UiTheme.gradientHeader(
            "Quiz Server",
            "Send questions to clients, receive answers, and calculate the final score."
        ), BorderLayout.NORTH);

        JPanel content = new JPanel(new BorderLayout(12, 12));
        content.setBackground(UiTheme.BACKGROUND);

        JPanel form = UiTheme.card();
        form.setLayout(new GridBagLayout());
        JButton btnStart = UiTheme.primaryButton("Start Server");
        JButton btnStop = UiTheme.secondaryButton("Stop");
        addFormLabel(form, "Port", 0, 0);
        addFormField(form, txtPort, 1, 0, 1.0);
        addFormButton(form, btnStart, 2, 0);
        addFormButton(form, btnStop, 3, 0);
        UiTheme.styleTree(form);
        content.add(form, BorderLayout.NORTH);

        JPanel logPanel = UiTheme.card();
        logPanel.add(UiTheme.title("Quiz server log"), BorderLayout.NORTH);
        logArea.setEditable(false);
        UiTheme.styleTree(logArea);
        logPanel.add(UiTheme.scroll(logArea), BorderLayout.CENTER);
        content.add(logPanel, BorderLayout.CENTER);

        page.add(content, BorderLayout.CENTER);
        setContentPane(page);

        btnStart.addActionListener(e -> startServer());
        btnStop.addActionListener(e -> stopServer());

        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                stopServer();
            }
        });
    }

    private void addFormLabel(JPanel panel, String text, int x, int y) {
        GridBagConstraints constraints = new GridBagConstraints();
        constraints.gridx = x;
        constraints.gridy = y;
        constraints.anchor = GridBagConstraints.WEST;
        constraints.insets = new Insets(6, 6, 6, 6);
        panel.add(new JLabel(text + ":"), constraints);
    }

    private void addFormField(JPanel panel, JTextField field, int x, int y, double weightX) {
        GridBagConstraints constraints = new GridBagConstraints();
        constraints.gridx = x;
        constraints.gridy = y;
        constraints.weightx = weightX;
        constraints.fill = GridBagConstraints.HORIZONTAL;
        constraints.insets = new Insets(6, 6, 6, 6);
        panel.add(field, constraints);
    }

    private void addFormButton(JPanel panel, JButton button, int x, int y) {
        GridBagConstraints constraints = new GridBagConstraints();
        constraints.gridx = x;
        constraints.gridy = y;
        constraints.anchor = GridBagConstraints.WEST;
        constraints.insets = new Insets(6, 6, 6, 6);
        panel.add(button, constraints);
    }

    private void startServer() {
        if (running) {
            appendLog("Quiz server is already running.");
            return;
        }

        int port;
        try {
            port = Integer.parseInt(txtPort.getText().trim());
        } catch (NumberFormatException ex) {
            JOptionPane.showMessageDialog(this, "Invalid port number.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        try {
            serverSocket = new ServerSocket(port);
            running = true;
            appendLog("Quiz server started on port " + port);
            appendLog("Question bank: " + QUESTIONS.length + " questions");
            new Thread(this::acceptLoop, "quiz-server").start();
        } catch (IOException ex) {
            JOptionPane.showMessageDialog(this, "Cannot start quiz server: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void acceptLoop() {
        while (running) {
            try {
                Socket socket = serverSocket.accept();
                new Thread(() -> handleClient(socket), "quiz-client").start();
            } catch (IOException ex) {
                if (running) {
                    appendLog("Accept error: " + ex.getMessage());
                }
            }
        }
    }

    private void handleClient(Socket socket) {
        try (Socket client = socket;
             DataInputStream input = new DataInputStream(client.getInputStream());
             DataOutputStream output = new DataOutputStream(client.getOutputStream())) {
            String studentName = input.readUTF().trim();
            if (studentName.isEmpty()) {
                studentName = "Student";
            }

            appendLog(studentName + " connected from " + client.getRemoteSocketAddress());
            output.writeInt(QUESTIONS.length);
            output.flush();

            int score = 0;
            for (int i = 0; i < QUESTIONS.length; i++) {
                QuizQuestion question = QUESTIONS[i];
                output.writeInt(i + 1);
                output.writeUTF(question.text);
                output.writeUTF(question.optionA);
                output.writeUTF(question.optionB);
                output.writeUTF(question.optionC);
                output.writeUTF(question.optionD);
                output.flush();

                String answer = input.readUTF().trim().toUpperCase(Locale.ROOT);
                boolean correct = question.correctAnswer.equals(answer);
                if (correct) {
                    score++;
                }

                String feedback = correct
                    ? "Correct. Current score: " + score + "/" + QUESTIONS.length
                    : "Incorrect. Correct answer: " + question.correctAnswer + ". Current score: " + score + "/" + QUESTIONS.length;
                output.writeUTF(feedback);
                output.flush();
                appendLog(studentName + " answered question " + (i + 1) + ": " + answer + " -> " + (correct ? "correct" : "incorrect"));
            }

            String finalResult = "Final score for " + studentName + ": " + score + "/" + QUESTIONS.length;
            output.writeUTF(finalResult);
            output.flush();
            appendLog(finalResult);
        } catch (IOException ex) {
            appendLog("Client error: " + ex.getMessage());
        }
    }

    private void stopServer() {
        running = false;
        if (serverSocket != null && !serverSocket.isClosed()) {
            try {
                serverSocket.close();
            } catch (IOException ignored) {
            }
        }
        appendLog("Quiz server stopped.");
    }

    private void appendLog(String line) {
        SwingUtilities.invokeLater(() -> {
            logArea.append(line + System.lineSeparator());
            logArea.setCaretPosition(logArea.getDocument().getLength());
        });
    }

    private static class QuizQuestion {
        private final String text;
        private final String optionA;
        private final String optionB;
        private final String optionC;
        private final String optionD;
        private final String correctAnswer;

        private QuizQuestion(String text, String optionA, String optionB, String optionC, String optionD, String correctAnswer) {
            this.text = text;
            this.optionA = optionA;
            this.optionB = optionB;
            this.optionC = optionC;
            this.optionD = optionD;
            this.correctAnswer = correctAnswer;
        }
    }
}
