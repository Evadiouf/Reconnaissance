const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixAttendanceData() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/senpointage';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connecté à MongoDB');

    const db = client.db();
    const timeEntries = db.collection('timeentries');
    const users = db.collection('users');

    // Trouver tous les TimeEntry
    const entries = await timeEntries.find({}).toArray();
    console.log(`📊 Trouvé ${entries.length} entrées de pointage`);

    // Pour chaque entrée, vérifier si le user correspond au bon employé
    for (const entry of entries) {
      const userId = entry.user;
      const user = await users.findOne({ _id: userId });

      if (user) {
        console.log(`\n🔍 Entrée ID: ${entry._id}`);
        console.log(`   User ID: ${userId}`);
        console.log(`   User: ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   Date: ${entry.clockInAt}`);

        // Si l'email est celui du compte RH (contact@naratechvision.com)
        // Il faut trouver l'employé correspondant et mettre à jour
        if (user.email === 'contact@naratechvision.com') {
          console.log(`   ⚠️  Cette entrée pointe vers le compte RH`);
          console.log(`   💡 Il faut trouver l'employé correspondant et mettre à jour`);
        }
      }
    }

    console.log('\n✅ Analyse terminée');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.close();
  }
}

fixAttendanceData();
