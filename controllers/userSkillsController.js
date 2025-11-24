import User from "../entities/User.js";

export async function updateUserSkills(req, res) {
	try {
		const { userId, skills } = req.body;
		
		if (!userId) {
			return res.status(400).json({ error: "Missing userId" });
		}
		
		if (!Array.isArray(skills)) {
			return res.status(400).json({ error: "Skills must be an array" });
		}
		
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		
		await User.updateSkillsById(userId, skills);
		
		return res.status(200).json({ 
			message: "User skills updated successfully",
			userId,
			skills 
		});
	} catch (err) {
		console.error("Error updating user skills:", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function getUserSkills(req, res) {
	try {
		const userId = req.params.id;
		
		if (!userId) {
			return res.status(400).json({ error: "Missing user ID" });
		}
		
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		
		const skills = await User.getSkillsById(userId);
		
		return res.status(200).json({ 
			userId,
			skills 
		});
	} catch (err) {
		console.error("Error getting user skills:", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

