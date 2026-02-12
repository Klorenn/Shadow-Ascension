using Godot;
using System;

public partial class PlayerController : CharacterBody2D
{
	[Export] public int Speed = 300;
	[Export] public int MaxHealth = 3;
	[Export] public float RotationLerpSpeed = 10.0f;

	[Signal] public delegate void OnDeathEventHandler();

	private int _currentHealth;
	private bool _dead;

	public int CurrentHealth => _currentHealth;

	public override void _Ready()
	{
		_currentHealth = MaxHealth;
		_dead = false;
	}

	public override void _PhysicsProcess(double delta)
	{
		if (_dead) return;

		// Movement
		float directionX = Input.GetAxis("move_left", "move_right");
		float directionY = Input.GetAxis("move_up", "move_down");
		Vector2 direction = new Vector2(directionX, directionY);
		if (direction.Length() > 1.0f)
			direction = direction.Normalized();
		Velocity = direction * Speed;
		MoveAndSlide();

		// Smooth rotation toward global mouse position
		Vector2 mousePos = GetGlobalMousePosition();
		float targetAngle = (mousePos - GlobalPosition).Angle();
		Rotation = Mathf.LerpAngle(Rotation, targetAngle, RotationLerpSpeed * (float)delta);
	}

	public void TakeDamage(int amount)
	{
		if (_dead) return;
		_currentHealth = Mathf.Max(0, _currentHealth - amount);
		if (_currentHealth <= 0)
		{
			_dead = true;
			EmitSignal(SignalName.OnDeath);
		}
	}
}
