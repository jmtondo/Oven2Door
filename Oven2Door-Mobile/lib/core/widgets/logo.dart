import 'package:flutter/material.dart';

class Oven2DoorLogo extends StatelessWidget {
  final double size;
  const Oven2DoorLogo({super.key, this.size = 48});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary,
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.local_pizza, color: Colors.white),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('Oven2Door', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Text('Delivering fresh', style: TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ],
    );
  }
}
