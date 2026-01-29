import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SubscriptionsService } from './subscriptions.service';

async function seedPlans() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const subscriptionsService = app.get(SubscriptionsService);

  try {
    console.log('🌱 Création des plans d\'abonnement...');

    // Vérifier si des plans existent déjà
    const existingPlans = await subscriptionsService.listAll();
    if (existingPlans.length > 0) {
      console.log(`ℹ️  ${existingPlans.length} plan(s) déjà existant(s):`);
      existingPlans.forEach(plan => {
        console.log(`   - ${plan.name}: ${plan.amount} ${plan.currency} / ${plan.recurrenceMonths} mois (Limite: ${plan.employeeLimit || 'Illimité'})`);
      });
      console.log('\n⚠️  Pour éviter les doublons, le seed est annulé.');
      console.log('   Si vous voulez recréer les plans, supprimez-les d\'abord de la base de données.');
      await app.close();
      return;
    }

    // Plan Starter - 10 employés max, 15 000 XOF/mois
    const starter = await subscriptionsService.create({
      name: 'Starter',
      amount: 15000,
      recurrenceMonths: 1,
      currency: 'XOF',
      employeeLimit: 10,
      isActive: true,
      visible: true,
    });
    console.log('✅ Plan Starter créé:', starter._id);

    // Plan Business - 50 employés max, 45 000 XOF/mois
    const business = await subscriptionsService.create({
      name: 'Business',
      amount: 45000,
      recurrenceMonths: 1,
      currency: 'XOF',
      employeeLimit: 50,
      isActive: true,
      visible: true,
    });
    console.log('✅ Plan Business créé:', business._id);

    // Plan Enterprise - Illimité, 120 000 XOF/mois
    const enterprise = await subscriptionsService.create({
      name: 'Enterprise',
      amount: 120000,
      recurrenceMonths: 1,
      currency: 'XOF',
      employeeLimit: undefined, // Illimité
      isActive: true,
      visible: true,
    });
    console.log('✅ Plan Enterprise créé:', enterprise._id);

    console.log('\n🎉 Tous les plans d\'abonnement ont été créés avec succès !');
    console.log('\n📋 Résumé des plans créés:');
    console.log('   1. Starter: 15 000 XOF/mois (max 10 employés)');
    console.log('   2. Business: 45 000 XOF/mois (max 50 employés)');
    console.log('   3. Enterprise: 120 000 XOF/mois (illimité)');

  } catch (error) {
    console.error('❌ Erreur lors de la création des plans:', error);
  } finally {
    await app.close();
  }
}

seedPlans();
