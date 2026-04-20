package com.student52300082.networkproject.common;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.GradientPaint;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Insets;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JComponent;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JRadioButton;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.ScrollPaneConstants;
import javax.swing.UIManager;
import javax.swing.border.Border;
import javax.swing.border.EmptyBorder;
import javax.swing.plaf.basic.BasicButtonUI;

public final class UiTheme {
    public static final Color BACKGROUND = new Color(238, 244, 242);
    public static final Color SURFACE = new Color(255, 255, 252);
    public static final Color INK = new Color(24, 34, 32);
    public static final Color MUTED = new Color(72, 88, 84);
    public static final Color PRIMARY = new Color(0, 104, 92);
    public static final Color PRIMARY_DARK = new Color(0, 64, 58);
    public static final Color PRIMARY_TEXT = Color.WHITE;
    public static final Color SECONDARY_TEXT = new Color(0, 82, 73);
    public static final Color ACCENT = new Color(226, 116, 55);
    public static final Color ACCENT_DARK = new Color(178, 76, 35);
    public static final Color LINE = new Color(196, 211, 207);
    public static final Color CONSOLE = new Color(15, 26, 24);
    public static final Color CONSOLE_TEXT = new Color(224, 244, 236);

    public static final Font TITLE_FONT = new Font("Segoe UI Semibold", Font.BOLD, 24);
    public static final Font SUBTITLE_FONT = new Font("Segoe UI", Font.PLAIN, 13);
    public static final Font BODY_FONT = new Font("Segoe UI", Font.PLAIN, 13);
    public static final Font BUTTON_FONT = new Font("Segoe UI Semibold", Font.BOLD, 13);
    public static final Font MONO_FONT = new Font("Consolas", Font.PLAIN, 13);

    private UiTheme() {
    }

    public static void install() {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {
        }
        UIManager.put("Button.focus", new Color(0, 0, 0, 0));
        UIManager.put("Button.foreground", PRIMARY_TEXT);
        UIManager.put("Button.background", PRIMARY);
        UIManager.put("Button.select", PRIMARY_DARK);
        UIManager.put("Button.disabledText", MUTED);
        UIManager.put("Label.foreground", INK);
        UIManager.put("TextField.foreground", INK);
        UIManager.put("TextField.background", Color.WHITE);
        UIManager.put("TextField.caretForeground", PRIMARY);
        UIManager.put("TextArea.caretForeground", PRIMARY);
    }

    public static void prepareFrame(JFrame frame) {
        install();
        frame.getContentPane().setBackground(BACKGROUND);
    }

    public static JPanel page(int top, int left, int bottom, int right) {
        JPanel panel = new JPanel(new BorderLayout(12, 12));
        panel.setBackground(BACKGROUND);
        panel.setBorder(new EmptyBorder(top, left, bottom, right));
        return panel;
    }

    public static JPanel toolbar() {
        JPanel panel = new JPanel();
        panel.setBackground(SURFACE);
        panel.setBorder(compoundBorder());
        return panel;
    }

    public static JLabel title(String text) {
        JLabel label = new JLabel(text);
        label.setFont(TITLE_FONT);
        label.setForeground(INK);
        return label;
    }

    public static JLabel subtitle(String text) {
        JLabel label = new JLabel(text);
        label.setFont(SUBTITLE_FONT);
        label.setForeground(MUTED);
        return label;
    }

    public static JTextArea logArea() {
        JTextArea area = new JTextArea();
        area.setEditable(false);
        area.setFont(MONO_FONT);
        area.setForeground(CONSOLE_TEXT);
        area.setBackground(CONSOLE);
        area.setCaretColor(CONSOLE_TEXT);
        area.setMargin(new Insets(12, 12, 12, 12));
        return area;
    }

    public static JScrollPane scroll(Component component) {
        JScrollPane scrollPane = new JScrollPane(component);
        scrollPane.setBorder(BorderFactory.createLineBorder(LINE));
        scrollPane.getViewport().setBackground(component.getBackground());
        scrollPane.setVerticalScrollBarPolicy(ScrollPaneConstants.VERTICAL_SCROLLBAR_ALWAYS);
        scrollPane.setHorizontalScrollBarPolicy(ScrollPaneConstants.HORIZONTAL_SCROLLBAR_AS_NEEDED);
        return scrollPane;
    }

    public static JButton primaryButton(String text) {
        JButton button = new JButton(text);
        styleButton(button, PRIMARY, PRIMARY_TEXT);
        return button;
    }

    public static JButton accentButton(String text) {
        JButton button = new JButton(text);
        styleButton(button, ACCENT, Color.WHITE);
        return button;
    }

    public static JButton secondaryButton(String text) {
        JButton button = new JButton(text);
        styleButton(button, Color.WHITE, SECONDARY_TEXT);
        button.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(PRIMARY),
            new EmptyBorder(8, 14, 8, 14)
        ));
        return button;
    }

    public static void styleTree(Component component) {
        if (component instanceof JPanel) {
            JPanel panel = (JPanel) component;
            if (panel.getBackground() == null || Color.LIGHT_GRAY.equals(panel.getBackground())) {
                panel.setBackground(BACKGROUND);
            }
        } else if (component instanceof JButton) {
            JButton button = (JButton) component;
            if (!Boolean.TRUE.equals(button.getClientProperty("uiThemeStyled"))) {
                styleButton(button, PRIMARY, PRIMARY_TEXT);
            }
        } else if (component instanceof JTextField) {
            JTextField field = (JTextField) component;
            field.setFont(BODY_FONT);
            field.setForeground(INK);
            field.setBackground(Color.WHITE);
            field.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(LINE),
                new EmptyBorder(6, 8, 6, 8)
            ));
        } else if (component instanceof JComboBox) {
            JComboBox<?> comboBox = (JComboBox<?>) component;
            comboBox.setFont(BODY_FONT);
            comboBox.setForeground(INK);
            comboBox.setBackground(Color.WHITE);
        } else if (component instanceof JRadioButton) {
            JRadioButton radioButton = (JRadioButton) component;
            radioButton.setFont(BODY_FONT);
            radioButton.setForeground(INK);
            radioButton.setBackground(SURFACE);
            radioButton.setOpaque(true);
        } else if (component instanceof JTextArea) {
            JTextArea area = (JTextArea) component;
            area.setFont(MONO_FONT);
            area.setForeground(CONSOLE_TEXT);
            area.setBackground(CONSOLE);
            area.setMargin(new Insets(12, 12, 12, 12));
        } else if (component instanceof JLabel) {
            JLabel label = (JLabel) component;
            label.setFont(BODY_FONT);
            label.setForeground(INK);
        } else if (component instanceof JScrollPane) {
            JScrollPane scrollPane = (JScrollPane) component;
            scrollPane.setBorder(BorderFactory.createLineBorder(LINE));
        }

        if (component instanceof java.awt.Container) {
            Component[] children = ((java.awt.Container) component).getComponents();
            for (Component child : children) {
                styleTree(child);
            }
        }
    }

    public static JPanel gradientHeader(String title, String subtitle) {
        JPanel header = new GradientHeaderPanel();
        header.setLayout(new BorderLayout(4, 4));
        header.setBorder(new EmptyBorder(24, 28, 24, 28));

        JLabel titleLabel = new JLabel(title);
        titleLabel.setFont(new Font("Segoe UI Semibold", Font.BOLD, 28));
        titleLabel.setForeground(Color.WHITE);

        JLabel subtitleLabel = new JLabel(subtitle);
        subtitleLabel.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        subtitleLabel.setForeground(new Color(222, 240, 234));

        header.add(titleLabel, BorderLayout.NORTH);
        header.add(subtitleLabel, BorderLayout.SOUTH);
        return header;
    }

    public static JPanel card() {
        JPanel panel = new JPanel(new BorderLayout(8, 8));
        panel.setBackground(SURFACE);
        panel.setBorder(compoundBorder());
        return panel;
    }

    private static Border compoundBorder() {
        return BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(LINE),
            new EmptyBorder(12, 14, 12, 14)
        );
    }

    private static void styleButton(JButton button, Color background, Color foreground) {
        button.putClientProperty("uiThemeStyled", Boolean.TRUE);
        button.setUI(new BasicButtonUI());
        button.setFont(BUTTON_FONT);
        button.setForeground(foreground);
        button.setBackground(background);
        button.setOpaque(true);
        button.setContentAreaFilled(true);
        button.setBorderPainted(true);
        button.setFocusPainted(false);
        button.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        button.setMargin(new Insets(8, 14, 8, 14));
        button.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(background.darker()),
            new EmptyBorder(8, 14, 8, 14)
        ));
        button.getModel().addChangeListener(e -> {
            if (button.isEnabled()) {
                button.setForeground(foreground);
                button.setBackground(background);
            } else {
                button.setForeground(MUTED);
                button.setBackground(new Color(218, 226, 224));
            }
        });
    }

    private static class GradientHeaderPanel extends JPanel {
        @Override
        protected void paintComponent(Graphics graphics) {
            Graphics2D g2 = (Graphics2D) graphics.create();
            g2.setPaint(new GradientPaint(0, 0, PRIMARY_DARK, getWidth(), getHeight(), PRIMARY));
            g2.fillRoundRect(0, 0, getWidth(), getHeight(), 26, 26);
            g2.setColor(new Color(255, 255, 255, 24));
            g2.fillOval(getWidth() - 160, -60, 220, 220);
            g2.setColor(new Color(230, 143, 73, 95));
            g2.fillOval(getWidth() - 72, getHeight() - 58, 92, 92);
            g2.dispose();
            super.paintComponent(graphics);
        }

        @Override
        public boolean isOpaque() {
            return false;
        }

        @Override
        public Dimension getPreferredSize() {
            return new Dimension(super.getPreferredSize().width, 112);
        }
    }
}
