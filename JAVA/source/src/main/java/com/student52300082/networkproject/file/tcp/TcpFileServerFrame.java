package com.student52300082.networkproject.file.tcp;

import com.student52300082.networkproject.common.AppConfig;
import com.student52300082.networkproject.common.UiTheme;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.BufferedInputStream;
import java.io.DataInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.ServerSocket;
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

public class TcpFileServerFrame extends JFrame {
    private final JTextField txtPort = new JTextField(String.valueOf(AppConfig.DEFAULT_TCP_FILE_PORT), 6);
    private final JTextField txtSaveDir = new JTextField(defaultSaveDir().getAbsolutePath(), 30);
    private final JTextArea logArea = new JTextArea();

    private ServerSocket serverSocket;
    private volatile boolean running;

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new TcpFileServerFrame().setVisible(true));
    }

    public TcpFileServerFrame() {
        UiTheme.prepareFrame(this);
        setTitle("TCP File Receiver");
        setSize(780, 540);
        setMinimumSize(new Dimension(720, 480));
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);

        JPanel page = UiTheme.page(16, 18, 18, 18);
        page.add(UiTheme.gradientHeader(
            "TCP File Receiver",
            "Start the receiver first, then send files from the TCP sender."
        ), BorderLayout.NORTH);

        JPanel content = new JPanel(new BorderLayout(12, 12));
        content.setBackground(UiTheme.BACKGROUND);

        JPanel form = UiTheme.card();
        form.setLayout(new GridBagLayout());
        JButton btnBrowse = UiTheme.secondaryButton("Choose folder");
        JButton btnStart = UiTheme.primaryButton("Start Receiver");
        JButton btnStop = UiTheme.secondaryButton("Stop");

        addFormLabel(form, "Port", 0, 0);
        addFormField(form, txtPort, 1, 0, 0.0);
        addFormLabel(form, "Save folder", 0, 1);
        addFormField(form, txtSaveDir, 1, 1, 1.0, 2);
        addFormButton(form, btnBrowse, 3, 1);
        addFormButton(form, btnStart, 1, 2);
        addFormButton(form, btnStop, 2, 2);

        UiTheme.styleTree(form);
        content.add(form, BorderLayout.NORTH);

        JPanel logPanel = UiTheme.card();
        logPanel.add(UiTheme.title("Receiver log"), BorderLayout.NORTH);
        logArea.setEditable(false);
        UiTheme.styleTree(logArea);
        logPanel.add(UiTheme.scroll(logArea), BorderLayout.CENTER);
        content.add(logPanel, BorderLayout.CENTER);

        page.add(content, BorderLayout.CENTER);
        setContentPane(page);

        btnBrowse.addActionListener(e -> chooseSaveFolder());
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

    private void chooseSaveFolder() {
        JFileChooser chooser = new JFileChooser(txtSaveDir.getText().trim());
        chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
            txtSaveDir.setText(chooser.getSelectedFile().getAbsolutePath());
        }
    }

    private void startServer() {
        if (running) {
            appendLog("TCP file receiver is already running.");
            return;
        }

        int port;
        try {
            port = Integer.parseInt(txtPort.getText().trim());
        } catch (NumberFormatException ex) {
            JOptionPane.showMessageDialog(this, "Invalid port number.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        File folder = new File(txtSaveDir.getText().trim());
        if (!folder.exists() && !folder.mkdirs()) {
            JOptionPane.showMessageDialog(this, "Cannot create save folder.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        try {
            serverSocket = new ServerSocket(port);
            running = true;
            appendLog("TCP file receiver started on port " + port);
            new Thread(this::acceptLoop, "tcp-file-server").start();
        } catch (IOException ex) {
            JOptionPane.showMessageDialog(this, "Cannot start TCP file server: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void acceptLoop() {
        while (running) {
            try {
                Socket socket = serverSocket.accept();
                new Thread(() -> receiveFile(socket), "tcp-file-client").start();
            } catch (IOException ex) {
                if (running) {
                    appendLog("Accept error: " + ex.getMessage());
                }
            }
        }
    }

    private void receiveFile(Socket socket) {
        try (Socket clientSocket = socket;
             DataInputStream input = new DataInputStream(new BufferedInputStream(clientSocket.getInputStream()))) {
            String fileName = new File(input.readUTF()).getName();
            long fileSize = input.readLong();
            File outputFile = uniqueFile(new File(txtSaveDir.getText().trim()), fileName);
            appendLog("Receiving " + fileName + " (" + fileSize + " bytes) from " + clientSocket.getRemoteSocketAddress());

            try (FileOutputStream output = new FileOutputStream(outputFile)) {
                byte[] buffer = new byte[AppConfig.FILE_BUFFER_SIZE];
                long remaining = fileSize;
                while (remaining > 0) {
                    int read = input.read(buffer, 0, (int) Math.min(buffer.length, remaining));
                    if (read == -1) {
                        throw new IOException("Connection closed before file completed.");
                    }
                    output.write(buffer, 0, read);
                    remaining -= read;
                }
            }
            appendLog("Saved file: " + outputFile.getAbsolutePath());
        } catch (IOException ex) {
            appendLog("Receive failed: " + ex.getMessage());
        }
    }

    private File uniqueFile(File folder, String fileName) {
        File file = new File(folder, fileName);
        if (!file.exists()) {
            return file;
        }
        String baseName = fileName;
        String extension = "";
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex > 0) {
            baseName = fileName.substring(0, dotIndex);
            extension = fileName.substring(dotIndex);
        }
        int index = 1;
        while (true) {
            File candidate = new File(folder, baseName + "_" + index + extension);
            if (!candidate.exists()) {
                return candidate;
            }
            index++;
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
        appendLog("TCP file receiver stopped.");
    }

    private static File defaultSaveDir() {
        File folder = new File(System.getProperty("user.home"), "Downloads/tcp_received");
        if (!folder.exists()) {
            folder.mkdirs();
        }
        return folder;
    }

    private void appendLog(String line) {
        SwingUtilities.invokeLater(() -> {
            logArea.append(line + System.lineSeparator());
            logArea.setCaretPosition(logArea.getDocument().getLength());
        });
    }
}
