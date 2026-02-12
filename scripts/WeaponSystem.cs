using Godot;
using System;

public partial class WeaponSystem : Node2D
{
	[Export] public PackedScene ProjectileScene;
	[Export] public float FireIntervalSeconds = 0.5f;
	[Export] public float DetectionRadius = 400.0f;

	private Node2D _player;
	private Timer _fireTimer;

	public override void _Ready()
	{
		_player = GetParent() as Node2D;
		if (_player == null) _player = this;

		_fireTimer = new Timer();
		_fireTimer.WaitTime = FireIntervalSeconds;
		_fireTimer.OneShot = false;
		_fireTimer.Timeout += Fire;
		AddChild(_fireTimer);
		_fireTimer.Start();
	}

	private void Fire()
	{
		if (ProjectileScene == null || _player == null || !IsInstanceValid(_player)) return;

		Vector2 direction = GetFireDirection();
		var projectile = ProjectileScene.Instantiate<Projectile>();
		projectile.GlobalPosition = _player.GlobalPosition;
		projectile.Direction = direction;
		// Add to world (same parent as enemies, e.g. Main)
		Node world = GetTree().CurrentScene;
		if (_player.GetParent() != null)
			world = _player.GetParent();
		world.AddChild(projectile);
	}

	private Vector2 GetFireDirection()
	{
		// Prefer nearest enemy in detection radius
		var enemies = GetTree().GetNodesInGroup("Enemy");
		Node2D nearest = null;
		float nearestDistSq = DetectionRadius * DetectionRadius;

		Vector2 origin = _player.GlobalPosition;
		foreach (var node in enemies)
		{
			if (node is not Node2D n || !IsInstanceValid(n)) continue;
			float dSq = origin.DistanceSquaredTo(n.GlobalPosition);
			if (dSq <= nearestDistSq)
			{
				nearestDistSq = dSq;
				nearest = n;
			}
		}

		if (nearest != null)
			return (nearest.GlobalPosition - origin).Normalized();

		// Else fire in direction player is facing (rotation)
		return Vector2.Right.Rotated(_player.GlobalRotation);
	}
}
