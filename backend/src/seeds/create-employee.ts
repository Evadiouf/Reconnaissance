import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../users/schemas/user.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  
  try {
    const usersService = app.get(UsersService);
    const companiesService = app.get(CompaniesService);
    const userModel = app.get<Model<User>>(getModelToken(User.name));

    // Informations de l'employé à créer
    const employeeEmail = 'awamahecordiouf0726@gmail.com';
    const employeeFirstName = 'Awa';
    const employeeLastName = 'Diouf';
    const employeePassword = 'TempPass123!'; // Mot de passe temporaire

    // Vérifier si l'employé existe déjà
    const existingEmployee = await userModel.findOne({ email: employeeEmail.toLowerCase() }).exec();
    if (existingEmployee) {
      const existingId = (existingEmployee as any)._id?.toString() || (existingEmployee as any).id?.toString();
      console.log(`⚠️  L'employé existe déjà:`);
      console.log(`   Nom: ${existingEmployee.firstName} ${existingEmployee.lastName}`);
      console.log(`   Email: ${existingEmployee.email}`);
      console.log(`   ID: ${existingId}`);
      
      // Vérifier s'il est rattaché à une entreprise
      const companyId = await companiesService.findCompanyIdByUserId(existingId);
      if (companyId) {
        console.log(`   ✅ Déjà rattaché à l'entreprise: ${companyId}`);
      } else {
        console.log(`   ⚠️  Non rattaché à une entreprise`);
      }
      return;
    }

    // Trouver le compte RH pour obtenir son companyId
    const rhUser = await userModel.findOne({ email: 'contact@naratechvision.com' }).exec();
    if (!rhUser) {
      console.log('❌ Compte RH non trouvé (contact@naratechvision.com)');
      console.log('💡 Assurez-vous que le compte RH existe dans la base de données');
      return;
    }
    const rhUserId = (rhUser as any)._id?.toString() || (rhUser as any).id?.toString();
    console.log(`🔍 Compte RH trouvé: ${rhUser.firstName} ${rhUser.lastName} (${rhUser.email}) - ID: ${rhUserId}`);

    // Trouver le companyId du RH
    const companyId = await companiesService.findCompanyIdByUserId(rhUserId);
    if (!companyId) {
      console.log('❌ Aucune entreprise trouvée pour le compte RH');
      console.log('💡 Le compte RH doit être propriétaire ou employé d\'une entreprise');
      return;
    }
    console.log(`🏢 Entreprise trouvée: ${companyId}`);

    // Créer l'employé
    console.log(`\n📝 Création de l'employé...`);
    console.log(`   Prénom: ${employeeFirstName}`);
    console.log(`   Nom: ${employeeLastName}`);
    console.log(`   Email: ${employeeEmail}`);
    console.log(`   Mot de passe temporaire: ${employeePassword}`);

    const createdUser = await usersService.create({
      firstName: employeeFirstName,
      lastName: employeeLastName,
      email: employeeEmail,
      password: employeePassword,
      companyId: companyId, // Rattachement automatique à l'entreprise
    });

    const createdUserId = (createdUser as any)._id?.toString() || (createdUser as any).id?.toString();
    console.log(`\n✅ Employé créé avec succès !`);
    console.log(`   ID: ${createdUserId}`);
    console.log(`   Nom: ${createdUser.firstName} ${createdUser.lastName}`);
    console.log(`   Email: ${createdUser.email}`);
    console.log(`   Rôles: ${createdUser.roles?.join(', ') || 'user'}`);
    console.log(`   Entreprise: ${companyId}`);

    // Vérifier que l'employé est bien rattaché à l'entreprise
    const verifyCompanyId = await companiesService.findCompanyIdByUserId(createdUserId);
    if (verifyCompanyId === companyId) {
      console.log(`\n✅ Vérification: L'employé est bien rattaché à l'entreprise`);
    } else {
      console.log(`\n⚠️  Attention: Le rattachement à l'entreprise pourrait avoir échoué`);
    }

    console.log(`\n💡 Prochaines étapes:`);
    console.log(`   1. L'employé peut maintenant se connecter avec:`);
    console.log(`      Email: ${employeeEmail}`);
    console.log(`      Mot de passe: ${employeePassword}`);
    console.log(`   2. Exécutez le script fix-attendance-data.ts pour corriger les anciens pointages`);
    console.log(`   3. Les nouveaux pointages utiliseront automatiquement le bon ID d'employé`);

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'employé:', error);
    if (error.response) {
      console.error('   Détails:', error.response.data);
    }
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();


