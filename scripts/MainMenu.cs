using Godot;
using System;

public partial class MainMenu : Control
{
	private AudioStreamPlayer buttonPressPlayer;
	private AudioStreamPlayer buttonSwitchPlayer;
	private Timer changeSceneTimer;

	public override void _Ready()
	{
		// initialize the sound players
		buttonPressPlayer = GetNode<AudioStreamPlayer>("Sounds/ButtonPress");
		buttonSwitchPlayer = GetNode<AudioStreamPlayer>("Sounds/ButtonSwitch");

		// connect the signals for button press
		GetNode<Button>("Menu/VBoxContainer/Play").Connect("pressed", new Callable(this, nameof(OnPlayAgainPressed)));
		GetNode<Button>("Menu/VBoxContainer/Quit").Connect("pressed", new Callable(this, nameof(OnQuitPressed)));

		// connect the signals for button focus change
		GetNode<Button>("Menu/VBoxContainer/Play").Connect("focus_entered", new Callable(this, nameof(OnButtonFocusEntered)));
		GetNode<Button>("Menu/VBoxContainer/Quit").Connect("focus_entered", new Callable(this, nameof(OnButtonFocusEntered)));

		// set initial focus to the Play button
		GetNode<Button>("Menu/VBoxContainer/Play").GrabFocus();
		
		// initialize and configure the timer
		changeSceneTimer = new Timer();
		AddChild(changeSceneTimer);
		changeSceneTimer.Connect("timeout", new Callable(this, nameof(OnChangeSceneTimerTimeout)));
	}

	private void OnPlayAgainPressed()
	{
		buttonPressPlayer.Play();
		changeSceneTimer.Start(buttonPressPlayer.Stream.GetLength());
	}

	private void OnQuitPressed()
	{
		buttonPressPlayer.Play();
		changeSceneTimer.Start(buttonPressPlayer.Stream.GetLength());
	}

	private void OnButtonFocusEntered()
	{
		buttonSwitchPlayer.Play();
	}
	
	private void OnChangeSceneTimerTimeout()
	{
		if (GetNode<Button>("Menu/VBoxContainer/Play").HasFocus())
		{
			GetTree().ChangeSceneToFile("res://scenes/main.tscn");
		}
		else
		{
			GetTree().Quit();
		}
	}
}
