using Godot;
using System;

public partial class EnemyAI : CharacterBody2D
{
	[Export] public int Speed = 120;
	[Export] public int MaxHealth = 3;
	[Export] public int ContactDamage = 1;
	[Export] public float ContactCooldown = 1.0f;

	[Export] public PackedScene ExperienceOrbScene;

	private Node2D _player;
	private int _currentHealth;
	private bool _dead;
	private float _contactCooldownRemaining;

	public override void _Ready()
	{
		AddToGroup("Enemy");
		_player = GetNodeOrNull<Node2D>("/root/Main/Player");
		if (_player == null)
			_player = GetTree().GetFirstNodeInGroup("Player") as Node2D;
		_currentHealth = MaxHealth;
		_dead = false;
		_contactCooldownRemaining = 0f;
	}

	public override void _PhysicsProcess(double delta)
	{
		if (_dead) return;
		if (_player == null || !IsInstanceValid(_player)) return;

		_contactCooldownRemaining = Mathf.Max(0f, _contactCooldownRemaining - (float)delta);

		Vector2 direction = (_player.GlobalPosition - GlobalPosition).Normalized();
		Velocity = direction * Speed;
		MoveAndSlide();

		// Contact damage: check if we're overlapping the player (simplified: distance)
		float dist = GlobalPosition.DistanceTo(_player.GlobalPosition);
		if (dist < 20f && _contactCooldownRemaining <= 0f)
		{
			if (_player is PlayerController pc)
			{
				pc.TakeDamage(ContactDamage);
				_contactCooldownRemaining = ContactCooldown;
			}
		}
	}

	public void TakeDamage(int amount)
	{
		if (_dead) return;
		_currentHealth = Mathf.Max(0, _currentHealth - amount);
		if (_currentHealth <= 0)
		{
			_dead = true;
			SpawnExperienceOrb();
			QueueFree();
		}
	}

	private void SpawnExperienceOrb()
	{
		if (ExperienceOrbScene == null) return;
		var orb = ExperienceOrbScene.Instantiate<Node2D>();
		orb.GlobalPosition = GlobalPosition;
		GetParent().AddChild(orb);
	}
}
