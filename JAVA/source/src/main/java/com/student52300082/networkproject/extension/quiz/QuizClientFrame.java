package com.student52300082.networkproject.extension.quiz;

import com.student52300082.networkproject.common.AppConfig;
import com.student52300082.networkproject.common.UiTheme;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.GridLayout;
import java.awt.Insets;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.Socket;
import java.util.concurrent.ArrayBlockingQueue;
import javax.swing.BorderFactory;
import javax.swing.ButtonGroup;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JRadioButton;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;

public class QuizClientFrame extends JFrame {
    private static final Color FEEDBACK_CORRECT = new Color(0, 104, 92);
    private static final Color FEEDBACK_INCORRECT = new Color(178, 76, 35);

    private final JTextField txtHost = new JTextField(AppConfig.DEFAULT_HOST, 12);
    private final JTextField txtPort = new JTextField(String.valueOf(AppConfig.DEFAULT_QUIZ_PORT), 6);
    private final JTextField txtStudentName = new JTextField("Student 01", 14);
    private final JLabel lblQuestion = UiTheme.subtitle("<html>Press Start Quiz to receive questions from the server.</html>");
    private final JLabel lblFeedback = UiTheme.subtitle("<html><b>Answer check</b><br>Select an answer and press Check Answer.</html>");
    private final JRadioButton optionA = new JRadioButton("A.");
    private final JRadioButton optionB = new JRadioButton("B.");
    private final JRadioButton optionC = new JRadioButton("C.");
    private final JRadioButton optionD = new JRadioButton("D.");
    private final ButtonGroup answerGroup = new ButtonGroup();
    private final JButton btnStart = UiTheme.primaryButton("Start Quiz");
    private final JButton btnSubmit = UiTheme.accentButton("Check Answer");
    private final JButton btnNext = UiTheme.secondaryButton("Next Question");
    private final JTextArea resultArea = new JTextArea();
    private final ArrayBlockingQueue<String> answerQueue = new ArrayBlockingQueue<String>(1);
    private final ArrayBlockingQueue<Boolean> nextQuestionQueue = new ArrayBlockingQueue<Boolean>(1);

    private volatile boolean quizRunning;

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new QuizClientFrame().setVisible(true));
    }

    public QuizClientFrame() {
        UiTheme.prepareFrame(this);
        setTitle("Quiz Client-Server - Client");
        setSize(900, 700);
        setMinimumSize(new Dimension(820, 620));
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);

        JPanel page = UiTheme.page(16, 18, 18, 18);
        page.add(UiTheme.gradientHeader(
            "Quiz Client",
            "Connect to the quiz server, answer each question, and receive the final score."
        ), BorderLayout.NORTH);

        JPanel content = new JPanel(new BorderLayout(12, 12));
        content.setBackground(UiTheme.BACKGROUND);

        JPanel connectionForm = UiTheme.card();
        connectionForm.setLayout(new GridBagLayout());
        addFormLabel(connectionForm, "Host", 0, 0);
        addFormField(connectionForm, txtHost, 1, 0, 1.0);
        addFormLabel(connectionForm, "Port", 2, 0);
        addFormField(connectionForm, txtPort, 3, 0, 0.0);
        addFormLabel(connectionForm, "Student", 0, 1);
        addFormField(connectionForm, txtStudentName, 1, 1, 1.0, 2);
        addFormButton(connectionForm, btnStart, 3, 1);
        UiTheme.styleTree(connectionForm);
        content.add(connectionForm, BorderLayout.NORTH);

        JPanel mainPanel = new JPanel(new GridLayout(1, 2, 12, 0));
        mainPanel.setBackground(UiTheme.BACKGROUND);
        mainPanel.add(buildQuestionPanel());
        mainPanel.add(buildResultPanel());
        content.add(mainPanel, BorderLayout.CENTER);

        page.add(content, BorderLayout.CENTER);
        setContentPane(page);

        btnSubmit.setEnabled(false);
        btnNext.setEnabled(false);
        setAnswerOptionsEnabled(false);
        btnStart.addActionListener(e -> new Thread(this::runQuiz, "quiz-client").start());
        btnSubmit.addActionListener(e -> submitAnswer());
        btnNext.addActionListener(e -> nextQuestion());
    }

    private JPanel buildQuestionPanel() {
        JPanel questionPanel = UiTheme.card();
        questionPanel.add(UiTheme.title("Current question"), BorderLayout.NORTH);

        JPanel inner = new JPanel(new BorderLayout(8, 8));
        inner.setBackground(UiTheme.SURFACE);
        lblQuestion.setBorder(BorderFactory.createEmptyBorder(4, 4, 6, 4));
        inner.add(lblQuestion, BorderLayout.NORTH);

        JPanel options = new JPanel(new GridLayout(4, 1, 0, 6));
        options.setBackground(UiTheme.SURFACE);
        answerGroup.add(optionA);
        answerGroup.add(optionB);
        answerGroup.add(optionC);
        answerGroup.add(optionD);
        options.add(optionA);
        options.add(optionB);
        options.add(optionC);
        options.add(optionD);
        UiTheme.styleTree(options);
        inner.add(options, BorderLayout.CENTER);

        JPanel actionPanel = new JPanel(new BorderLayout(0, 8));
        actionPanel.setBackground(UiTheme.SURFACE);
        lblFeedback.setBorder(BorderFactory.createEmptyBorder(6, 4, 6, 4));
        actionPanel.add(lblFeedback, BorderLayout.NORTH);

        JPanel buttons = new JPanel(new GridLayout(1, 2, 8, 0));
        buttons.setBackground(UiTheme.SURFACE);
        buttons.add(btnSubmit);
        buttons.add(btnNext);
        actionPanel.add(buttons, BorderLayout.SOUTH);
        inner.add(actionPanel, BorderLayout.SOUTH);

        questionPanel.add(inner, BorderLayout.CENTER);
        return questionPanel;
    }

    private JPanel buildResultPanel() {
        JPanel resultPanel = UiTheme.card();
        resultPanel.add(UiTheme.title("Answer log"), BorderLayout.NORTH);
        resultArea.setEditable(false);
        UiTheme.styleTree(resultArea);
        resultPanel.add(UiTheme.scroll(resultArea), BorderLayout.CENTER);
        return resultPanel;
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
        addFormField(panel, field, x, y, weightX, 1);
    }

    private void addFormField(JPanel panel, JTextField field, int x, int y, double weightX, int width) {
        GridBagConstraints constraints = new GridBagConstraints();
        constraints.gridx = x;
        constraints.gridy = y;
        constraints.gridwidth = width;
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

    private void runQuiz() {
        if (quizRunning) {
            return;
        }

        int port;
        try {
            port = Integer.parseInt(txtPort.getText().trim());
        } catch (NumberFormatException ex) {
            JOptionPane.showMessageDialog(this, "Invalid port number.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        quizRunning = true;
        answerQueue.clear();
        nextQuestionQueue.clear();
        setQuizControls(false, false);
        setAnswerOptionsEnabled(false);
        setFeedback("Answer check", "Connecting to server...", UiTheme.MUTED);
        appendResult("Connecting to " + txtHost.getText().trim() + ":" + port);

        try (Socket socket = new Socket(txtHost.getText().trim(), port);
             DataOutputStream output = new DataOutputStream(socket.getOutputStream());
             DataInputStream input = new DataInputStream(socket.getInputStream())) {
            String studentName = txtStudentName.getText().trim();
            output.writeUTF(studentName);
            output.flush();

            int totalQuestions = input.readInt();
            appendResult("Connected. Total questions: " + totalQuestions);

            for (int i = 0; i < totalQuestions; i++) {
                int number = input.readInt();
                String question = input.readUTF();
                String a = input.readUTF();
                String b = input.readUTF();
                String c = input.readUTF();
                String d = input.readUTF();
                showQuestion(number, totalQuestions, question, a, b, c, d);

                String answer = answerQueue.take();
                output.writeUTF(answer);
                output.flush();
                appendResult("Question " + number + ": selected " + answer);
                String feedback = input.readUTF();
                appendResult(feedback);
                boolean lastQuestion = i == totalQuestions - 1;
                showAnswerFeedback(feedback, lastQuestion);
                if (!lastQuestion) {
                    nextQuestionQueue.take();
                }
            }

            String finalResult = input.readUTF();
            appendResult(finalResult);
            showFinalMessage(finalResult);
        } catch (IOException ex) {
            appendResult("Quiz failed: " + ex.getMessage());
            setFeedback("Connection error", ex.getMessage(), FEEDBACK_INCORRECT);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            appendResult("Quiz interrupted.");
            setFeedback("Interrupted", "Quiz thread was interrupted.", FEEDBACK_INCORRECT);
        } finally {
            quizRunning = false;
            setQuizControls(true, false);
            setAnswerOptionsEnabled(false);
        }
    }

    private void showQuestion(int number, int totalQuestions, String question, String a, String b, String c, String d) {
        SwingUtilities.invokeLater(() -> {
            lblQuestion.setText("<html><b>Question " + number + "/" + totalQuestions + "</b><br>" + question + "</html>");
            lblFeedback.setForeground(UiTheme.MUTED);
            lblFeedback.setText("<html><b>Answer check</b><br>Select an answer, then press Check Answer.</html>");
            optionA.setText("A. " + a);
            optionB.setText("B. " + b);
            optionC.setText("C. " + c);
            optionD.setText("D. " + d);
            answerGroup.clearSelection();
            btnSubmit.setEnabled(true);
            btnNext.setEnabled(false);
            setAnswerOptionsEnabled(true);
        });
    }

    private void showAnswerFeedback(String feedback, boolean lastQuestion) {
        boolean correct = feedback.startsWith("Correct");
        SwingUtilities.invokeLater(() -> {
            lblFeedback.setForeground(correct ? FEEDBACK_CORRECT : FEEDBACK_INCORRECT);
            lblFeedback.setText("<html><b>Answer check</b><br>" + escapeHtml(feedback) + "</html>");
            btnSubmit.setEnabled(false);
            btnNext.setEnabled(!lastQuestion);
            setAnswerOptionsEnabled(false);
        });
    }

    private void showFinalMessage(String finalResult) {
        SwingUtilities.invokeLater(() -> {
            lblQuestion.setText("<html><b>Quiz completed</b><br>" + finalResult + "</html>");
            lblFeedback.setForeground(FEEDBACK_CORRECT);
            lblFeedback.setText("<html><b>Final result</b><br>" + escapeHtml(finalResult) + "</html>");
            answerGroup.clearSelection();
            btnSubmit.setEnabled(false);
            btnNext.setEnabled(false);
            setAnswerOptionsEnabled(false);
        });
    }

    private void submitAnswer() {
        if (!quizRunning) {
            return;
        }

        String selected = getSelectedAnswer();
        if (selected == null) {
            JOptionPane.showMessageDialog(this, "Please choose one answer.", "Missing answer", JOptionPane.WARNING_MESSAGE);
            return;
        }

        btnSubmit.setEnabled(false);
        btnNext.setEnabled(false);
        setAnswerOptionsEnabled(false);
        answerQueue.offer(selected);
    }

    private void nextQuestion() {
        if (!quizRunning) {
            return;
        }
        btnNext.setEnabled(false);
        setFeedback("Answer check", "Loading next question...", UiTheme.MUTED);
        nextQuestionQueue.offer(Boolean.TRUE);
    }

    private String getSelectedAnswer() {
        if (optionA.isSelected()) {
            return "A";
        }
        if (optionB.isSelected()) {
            return "B";
        }
        if (optionC.isSelected()) {
            return "C";
        }
        if (optionD.isSelected()) {
            return "D";
        }
        return null;
    }

    private void setQuizControls(boolean startEnabled, boolean submitEnabled) {
        SwingUtilities.invokeLater(() -> {
            btnStart.setEnabled(startEnabled);
            btnSubmit.setEnabled(submitEnabled);
            btnNext.setEnabled(false);
        });
    }

    private void setAnswerOptionsEnabled(boolean enabled) {
        Runnable apply = () -> {
            optionA.setEnabled(enabled);
            optionB.setEnabled(enabled);
            optionC.setEnabled(enabled);
            optionD.setEnabled(enabled);
        };
        if (SwingUtilities.isEventDispatchThread()) {
            apply.run();
        } else {
            SwingUtilities.invokeLater(apply);
        }
    }

    private void setFeedback(String title, String message, Color color) {
        SwingUtilities.invokeLater(() -> {
            lblFeedback.setForeground(color);
            lblFeedback.setText("<html><b>" + escapeHtml(title) + "</b><br>" + escapeHtml(message) + "</html>");
        });
    }

    private String escapeHtml(String value) {
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;");
    }

    private void appendResult(String line) {
        SwingUtilities.invokeLater(() -> {
            resultArea.append(line + System.lineSeparator());
            resultArea.setCaretPosition(resultArea.getDocument().getLength());
        });
    }
}
