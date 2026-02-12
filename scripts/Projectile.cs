using Godot;
using System;

public partial class Projectile : Area2D
{
	[Export] public float Damage = 10.0f;
	[Export] public float Speed = 400.0f;

	public Vector2 Direction { get; set; } = Vector2.Right;

	public override void _Ready()
	{
		BodyEntered += OnBodyEntered;
	}

	public override void _Process(double delta)
	{
		GlobalPosition += Direction * Speed * (float)delta;
	}

	private void OnBodyEntered(Node2D body)
	{
		if (body.IsInGroup("Enemy"))
		{
			if (body is EnemyAI enemy)
			{
				enemy.TakeDamage((int)Damage);
			}
			QueueFree();
		}
	}
}
