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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;

public class QuizServerFrame extends JFrame {
    private static final int QUESTIONS_PER_SESSION = 4;
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
        ),
        new QuizQuestion(
            "Which port number helps the server identify a specific service?",
            "MAC address", "Subnet mask", "Port", "Thread id", "C"
        ),
        new QuizQuestion(
            "Which TCP class usually waits for client connections?",
            "Socket", "ServerSocket", "DatagramPacket", "URL", "B"
        ),
        new QuizQuestion(
            "Which UDP class represents one packet of data?",
            "Socket", "ServerSocket", "DatagramPacket", "BufferedInputStream", "C"
        ),
        new QuizQuestion(
            "Which statement best describes UDP?",
            "Connection-oriented and ordered", "Connectionless and lightweight", "Only used for files", "Cannot send text", "B"
        ),
        new QuizQuestion(
            "What is a common reason to use a worker thread in a Swing networking app?",
            "To change Java syntax", "To avoid freezing the UI", "To rename ports automatically", "To replace sockets", "B"
        ),
        new QuizQuestion(
            "Which class is useful for reading structured binary data from a socket?",
            "PrintWriter", "DataInputStream", "StringBuilder", "Graphics2D", "B"
        ),
        new QuizQuestion(
            "What usually happens if two servers try to bind the same port on one machine?",
            "Both run normally", "The second bind fails", "The first server exits automatically", "The port changes randomly", "B"
        ),
        new QuizQuestion(
            "In a client-server file transfer, what should the receiver know to stop reading the current file correctly?",
            "Only the sender host name", "The file name and the expected size", "Only the Java version", "Only the UI title", "B"
        ),
        new QuizQuestion(
            "Which method schedules Swing UI updates on the Event Dispatch Thread?",
            "System.gc()", "SwingUtilities.invokeLater", "Thread.yield", "ServerSocket.accept", "B"
        ),
        new QuizQuestion(
            "Why does UDP file transfer often need ACK and retry logic at the application layer?",
            "Because UDP already guarantees retransmission", "Because UDP does not guarantee delivery", "Because TCP blocks all packets", "Because Swing requires it", "B"
        ),
        new QuizQuestion(
            "Which data is most suitable for logging on the quiz server during a session?",
            "Only button colors", "Student answers and current score", "Only window size", "Only font family", "B"
        )
    };

    private final JTextField txtPort = new JTextField(String.valueOf(AppConfig.DEFAULT_QUIZ_PORT), 6);
    private final JTextArea logArea = new JTextArea();
    private final Map<String, QuestionDeck> questionDecks = new ConcurrentHashMap<String, QuestionDeck>();

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
            appendLog("Each new attempt receives " + QUESTIONS_PER_SESSION + " questions.");
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
            QuizQuestion[] sessionQuestions = nextQuestionsForStudent(studentName);
            appendLog("Prepared " + sessionQuestions.length + " questions for " + studentName + ".");
            output.writeInt(sessionQuestions.length);
            output.flush();

            int score = 0;
            for (int i = 0; i < sessionQuestions.length; i++) {
                QuizQuestion question = sessionQuestions[i];
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
                    ? "Correct. Current score: " + score + "/" + sessionQuestions.length
                    : "Incorrect. Correct answer: " + question.correctAnswer + ". Current score: " + score + "/" + sessionQuestions.length;
                output.writeUTF(feedback);
                output.flush();
                appendLog(studentName + " answered question " + (i + 1) + ": " + answer + " -> " + (correct ? "correct" : "incorrect"));
            }

            String finalResult = "Final score for " + studentName + ": " + score + "/" + sessionQuestions.length;
            output.writeUTF(finalResult);
            output.flush();
            appendLog(finalResult);
        } catch (IOException ex) {
            appendLog("Client error: " + ex.getMessage());
        }
    }

    private QuizQuestion[] nextQuestionsForStudent(String studentName) {
        String key = studentName.toLowerCase(Locale.ROOT);
        QuestionDeck deck = questionDecks.computeIfAbsent(key, ignored -> new QuestionDeck(QUESTIONS));
        synchronized (deck) {
            if (deck.remaining() < QUESTIONS_PER_SESSION) {
                deck.reset(QUESTIONS);
            }
            return deck.nextBatch(QUESTIONS_PER_SESSION);
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

    private static class QuestionDeck {
        private final List<QuizQuestion> questions = new ArrayList<QuizQuestion>();
        private int index;

        private QuestionDeck(QuizQuestion[] source) {
            reset(source);
        }

        private void reset(QuizQuestion[] source) {
            questions.clear();
            Collections.addAll(questions, source);
            Collections.shuffle(questions);
            index = 0;
        }

        private int remaining() {
            return questions.size() - index;
        }

        private QuizQuestion[] nextBatch(int count) {
            QuizQuestion[] batch = new QuizQuestion[count];
            for (int i = 0; i < count; i++) {
                batch[i] = questions.get(index++);
            }
            return batch;
        }
    }
}
