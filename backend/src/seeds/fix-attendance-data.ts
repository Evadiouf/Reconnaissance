import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { TimeEntry } from '../attendance/schemas/time-entry.schema';
import { User } from '../users/schemas/user.schema';
import { Types } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  
  try {
    const timeEntryModel = app.get<Model<TimeEntry>>(getModelToken(TimeEntry.name));
    const userModel = app.get<Model<User>>(getModelToken(User.name));

    // Trouver le compte RH (Eva Diouf)
    const rhUser = await userModel.findOne({ email: 'contact@naratechvision.com' }).exec();
    if (!rhUser) {
      console.log('❌ Compte RH non trouvé');
      return;
    }
    const rhUserId = (rhUser as any)._id?.toString() || (rhUser as any).id?.toString();
    console.log(`🔍 Compte RH trouvé: ${rhUser.firstName} ${rhUser.lastName} (${rhUser.email}) - ID: ${rhUserId}`);

    // Trouver l'employé (Awa Diouf) - chercher par nom si l'email ne fonctionne pas
    let employee = await userModel.findOne({ email: 'awamahecordiouf0726@gmail.com' }).exec();
    if (!employee) {
      // Essayer de trouver par nom (insensible à la casse)
      employee = await userModel.findOne({ 
        $or: [
          { firstName: /^Awa$/i, lastName: /^Diouf$/i },
          { firstName: /^awa$/i, lastName: /^diouf$/i }
        ]
      }).exec();
    }
    if (!employee) {
      // Lister tous les utilisateurs pour trouver l'employé
      console.log('❌ Employé non trouvé avec l\'email ou le nom spécifié. Liste de tous les utilisateurs:');
      const allUsers = await userModel.find({}).select('firstName lastName email _id').exec();
      console.log(`\n📋 Total utilisateurs dans la base: ${allUsers.length}`);
      for (const user of allUsers) {
        const userId = (user as any)._id?.toString() || (user as any).id?.toString();
        console.log(`   - ${user.firstName} ${user.lastName} (${user.email}) - ID: ${userId}`);
      }
      
      // Chercher un utilisateur qui pourrait être l'employé (par nom similaire)
      const possibleEmployee = allUsers.find(u => 
        (u.firstName?.toLowerCase().includes('awa') || u.lastName?.toLowerCase().includes('diouf')) &&
        u.email !== 'contact@naratechvision.com'
      );
      
      if (possibleEmployee) {
        const possibleEmployeeId = (possibleEmployee as any)._id?.toString() || (possibleEmployee as any).id?.toString();
        console.log(`\n💡 Utilisateur possible trouvé: ${possibleEmployee.firstName} ${possibleEmployee.lastName} (${possibleEmployee.email}) - ID: ${possibleEmployeeId}`);
        console.log(`   Voulez-vous utiliser cet utilisateur pour corriger les données ?`);
        employee = possibleEmployee;
      } else {
        // Si l'employé n'existe pas, on ne peut pas corriger les données
        console.log('\n⚠️  L\'employé Awa Diouf n\'existe pas encore dans la base de données.');
        console.log('💡 Solution: Créez d\'abord l\'employé via le formulaire "Ajouter un employé" avec l\'email: awamahecordiouf0726@gmail.com');
        
        // Continuer quand même pour afficher les entrées de pointage
        employee = null;
      }
    }
    
    let employeeId = null;
    if (employee) {
      employeeId = (employee as any)._id?.toString() || (employee as any).id?.toString();
      console.log(`🔍 Employé trouvé: ${employee.firstName} ${employee.lastName} (${employee.email}) - ID: ${employeeId}`);
    }

    // Trouver tous les TimeEntry qui pointent vers le compte RH
    const wrongEntries = await timeEntryModel.find({
      user: new Types.ObjectId(rhUserId)
    }).exec();

    console.log(`\n📊 Trouvé ${wrongEntries.length} entrée(s) de pointage pointant vers le compte RH`);
    
    // Afficher toutes les entrées de pointage pour analyse
    const allEntries = await timeEntryModel.find({}).populate('user', 'firstName lastName email').exec();
    console.log(`\n📋 Total des entrées de pointage dans la base: ${allEntries.length}`);
    for (const entry of allEntries) {
      const user = (entry as any).user;
      const entryId = (entry as any)._id?.toString() || (entry as any).id?.toString();
      const clockInDate = entry.clockInAt ? new Date(entry.clockInAt).toLocaleString('fr-FR') : 'N/A';
      console.log(`   - ID: ${entryId}`);
      console.log(`     Date: ${clockInDate}`);
      console.log(`     User: ${user?.firstName || 'N/A'} ${user?.lastName || 'N/A'} (${user?.email || 'N/A'})`);
      console.log(`     Clock Out: ${entry.clockOutAt ? new Date(entry.clockOutAt).toLocaleString('fr-FR') : 'Non'}`);
      console.log(``);
    }
    
    if (wrongEntries.length > 0) {
      if (!employee) {
        console.log(`\n⚠️  ${wrongEntries.length} entrée(s) de pointage pointent vers le compte RH au lieu de l'employé.`);
        console.log(`💡 Pour corriger ces données:`);
        console.log(`   1. Créez d'abord l'employé Awa Diouf via le formulaire "Ajouter un employé"`);
        console.log(`   2. Relancez ce script pour corriger automatiquement les données`);
      } else {
        console.log(`\n⚠️  ${wrongEntries.length} entrée(s) de pointage pointent vers le compte RH au lieu de l'employé.`);
        console.log(`💡 Pour corriger ces données, décommentez les lignes 66-70 dans le script et relancez-le.`);
      }
    } else {
      console.log(`\n✅ Aucune correction nécessaire - toutes les entrées pointent vers les bons utilisateurs.`);
    }

    if (wrongEntries.length === 0) {
      console.log('✅ Aucune correction nécessaire');
      return;
    }

    // Afficher les entrées à corriger
    for (const entry of wrongEntries) {
      console.log(`\n📝 Entrée ID: ${entry._id}`);
      console.log(`   Date: ${entry.clockInAt}`);
      console.log(`   Clock Out: ${entry.clockOutAt || 'Non'}`);
      console.log(`   Source: ${entry.source || 'N/A'}`);
      console.log(`   Notes: ${entry.notes || 'N/A'}`);
    }

    // Afficher les entrées à corriger seulement si l'employé existe
    if (employee && wrongEntries.length > 0) {
      // Demander confirmation avant de corriger
      console.log(`\n⚠️  ATTENTION: Cette opération va mettre à jour ${wrongEntries.length} entrées`);
      console.log(`   Les entrées pointant vers "${rhUser.firstName} ${rhUser.lastName}" seront mises à jour pour pointer vers "${employee.firstName} ${employee.lastName}"`);
      console.log(`\n💡 Pour corriger les données, décommentez les lignes suivantes dans le script:`);
      console.log(`   // await timeEntryModel.updateMany(`);
      console.log(`   //   { user: new Types.ObjectId(rhUserId) },`);
      console.log(`   //   { $set: { user: new Types.ObjectId(employeeId) } }`);
      console.log(`   // ).exec();`);

      // Décommentez ces lignes pour corriger les données :
      // await timeEntryModel.updateMany(
      //   { user: new Types.ObjectId(rhUserId) },
      //   { $set: { user: new Types.ObjectId(employeeId) } }
      // ).exec();
      // console.log(`\n✅ ${wrongEntries.length} entrées corrigées avec succès`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();

