package com.student52300082.networkproject.file.tcp;

import com.student52300082.networkproject.common.AppConfig;
import com.student52300082.networkproject.common.UiTheme;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.io.BufferedInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.Socket;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;

public class TcpFileClientFrame extends JFrame {
    private final JTextField txtHost = new JTextField(AppConfig.DEFAULT_HOST, 12);
    private final JTextField txtPort = new JTextField(String.valueOf(AppConfig.DEFAULT_TCP_FILE_PORT), 6);
    private final JTextField txtFile = new JTextField(36);
    private final JTextArea logArea = new JTextArea();

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new TcpFileClientFrame().setVisible(true));
    }

    public TcpFileClientFrame() {
        UiTheme.prepareFrame(this);
        setTitle("TCP File Sender");
        setSize(780, 520);
        setMinimumSize(new Dimension(720, 460));
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);

        JPanel page = UiTheme.page(16, 18, 18, 18);
        page.add(UiTheme.gradientHeader(
            "TCP File Sender",
            "Select a file, connect to the TCP receiver, and stream bytes reliably."
        ), BorderLayout.NORTH);

        JPanel content = new JPanel(new BorderLayout(12, 12));
        content.setBackground(UiTheme.BACKGROUND);

        JPanel form = UiTheme.card();
        form.setLayout(new GridBagLayout());
        JButton btnBrowse = UiTheme.secondaryButton("Browse file");
        JButton btnSend = UiTheme.accentButton("Send File");

        addFormLabel(form, "Host", 0, 0);
        addFormField(form, txtHost, 1, 0, 1.0);
        addFormLabel(form, "Port", 2, 0);
        addFormField(form, txtPort, 3, 0, 0.0);
        addFormLabel(form, "Selected file", 0, 1);
        addFormField(form, txtFile, 1, 1, 1.0, 2);
        addFormButton(form, btnBrowse, 3, 1);
        addFormButton(form, btnSend, 1, 2);

        UiTheme.styleTree(form);
        content.add(form, BorderLayout.NORTH);

        JPanel logPanel = UiTheme.card();
        logPanel.add(UiTheme.title("Transfer log"), BorderLayout.NORTH);
        logArea.setEditable(false);
        UiTheme.styleTree(logArea);
        logPanel.add(UiTheme.scroll(logArea), BorderLayout.CENTER);
        content.add(logPanel, BorderLayout.CENTER);

        page.add(content, BorderLayout.CENTER);
        setContentPane(page);

        btnBrowse.addActionListener(e -> chooseFile());
        btnSend.addActionListener(e -> new Thread(this::sendFile, "tcp-file-sender").start());
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

    private void chooseFile() {
        JFileChooser chooser = new JFileChooser();
        if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
            txtFile.setText(chooser.getSelectedFile().getAbsolutePath());
        }
    }

    private void sendFile() {
        File file = new File(txtFile.getText().trim());
        if (!file.isFile()) {
            JOptionPane.showMessageDialog(this, "Please choose a valid file.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        String host = txtHost.getText().trim();
        int port;
        try {
            port = Integer.parseInt(txtPort.getText().trim());
        } catch (NumberFormatException ex) {
            JOptionPane.showMessageDialog(this, "Invalid port number.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        appendLog("Sending " + file.getName() + " (" + file.length() + " bytes) to " + host + ":" + port);
        try (Socket socket = new Socket(host, port);
             DataOutputStream output = new DataOutputStream(socket.getOutputStream());
             BufferedInputStream input = new BufferedInputStream(new FileInputStream(file))) {
            output.writeUTF(file.getName());
            output.writeLong(file.length());

            byte[] buffer = new byte[AppConfig.FILE_BUFFER_SIZE];
            int read;
            long total = 0;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
                total += read;
            }
            output.flush();
            appendLog("Send completed. Bytes sent: " + total);
        } catch (IOException ex) {
            appendLog("Send failed: " + ex.getMessage());
        }
    }

    private void appendLog(String line) {
        SwingUtilities.invokeLater(() -> {
            logArea.append(line + System.lineSeparator());
            logArea.setCaretPosition(logArea.getDocument().getLength());
        });
    }
}
