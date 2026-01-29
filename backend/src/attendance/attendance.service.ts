import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TimeEntry } from './schemas/time-entry.schema';
import { DailyStats } from './schemas/daily-stats.schema';
import { Company } from '../companies/schemas/company.schema';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(TimeEntry.name) private readonly timeEntryModel: Model<TimeEntry>,
    @InjectModel(DailyStats.name) private readonly dailyStatsModel: Model<DailyStats>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
  ) {}

  private async ensureUserInCompany(userId: string, companyId: string): Promise<void> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('companyId invalide');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const uid = new Types.ObjectId(userId);
    const exists = await this.companyModel
      .exists({
        _id: new Types.ObjectId(companyId),
        $or: [{ owner: uid }, { employees: uid }],
      })
      .exec();

    if (!exists) {
      throw new ForbiddenException("La personne reconnue n'appartient pas à cette entreprise");
    }
  }

  private async ensureRequesterAndTargetInCompany(
    requesterUserId: string,
    targetUserId: string,
    companyId: string,
  ): Promise<void> {
    try {
      await this.ensureUserInCompany(requesterUserId, companyId);
    } catch (err: any) {
      console.error('❌ [Attendance] requester not in company', {
        requesterUserId,
        targetUserId,
        companyId,
        message: err?.message,
      });
      throw err;
    }

    // target doit aussi appartenir à l'entreprise (owner ou employee)
    try {
      await this.ensureUserInCompany(targetUserId, companyId);
    } catch (err: any) {
      console.error('❌ [Attendance] target not in company', {
        requesterUserId,
        targetUserId,
        companyId,
        message: err?.message,
      });
      throw err;
    }
  }

  async clearCompanyHistory(
    requesterUserId: string,
    q: { companyId: string; from?: Date; to?: Date },
  ): Promise<{ deletedCount: number }> {
    await this.ensureUserInCompany(requesterUserId, q.companyId);

    const criteria: any = {
      company: new Types.ObjectId(q.companyId),
    };

    if (q.from || q.to) {
      criteria.clockInAt = {};
      if (q.from) criteria.clockInAt.$gte = q.from;
      if (q.to) criteria.clockInAt.$lte = q.to;
    }

    const result = await this.timeEntryModel.deleteMany(criteria).exec();
    return { deletedCount: result?.deletedCount ?? 0 };
  }

  async clockIn(userId: string, companyId: string, data: { source?: string; location?: any; notes?: string }) {
    console.log('🔵 [AttendanceService.clockIn] Début du pointage');
    console.log('   👤 userId:', userId);
    console.log('   🏢 companyId:', companyId);
    console.log('   📝 data:', data);

    // Compat: pointage "pour soi" (requester == target)
    await this.ensureRequesterAndTargetInCompany(userId, userId, companyId);

    const open = await this.timeEntryModel.findOne({
      user: new Types.ObjectId(userId),
      company: new Types.ObjectId(companyId),
      clockOutAt: { $exists: false },
    }).exec();
    if (open) {
      // Fermer automatiquement le pointage ouvert au lieu de rejeter
      console.log('⚠️ Pointage ouvert détecté, fermeture automatique...');
      open.clockOutAt = new Date();
      await open.save();
      console.log('✅ Pointage ouvert fermé automatiquement');
    }

    const entry = new this.timeEntryModel({
      user: new Types.ObjectId(userId),
      company: new Types.ObjectId(companyId),
      clockInAt: new Date(),
      source: data?.source,
      location: data?.location,
      notes: data?.notes,
    });
    
    const savedEntry = await entry.save();
    console.log('✅ [AttendanceService.clockIn] Pointage enregistré avec succès');
    console.log('   🆔 Entry ID:', savedEntry._id);
    console.log('   👤 User ID enregistré:', savedEntry.user);

    const populated = await this.timeEntryModel
      .findById(savedEntry._id)
      .populate('user', 'firstName lastName email')
      .exec();

    return populated || savedEntry;
  }

  async clockInFor(
    requesterUserId: string,
    targetUserId: string,
    companyId: string,
    data: { source?: string; location?: any; notes?: string },
  ) {
    await this.ensureRequesterAndTargetInCompany(requesterUserId, targetUserId, companyId);
    return this.clockIn(targetUserId, companyId, data);
  }

  async clockOut(userId: string, companyId: string, data: { notes?: string }) {
    // Compat: pointage "pour soi" (requester == target)
    await this.ensureRequesterAndTargetInCompany(userId, userId, companyId);

    const entry = await this.timeEntryModel
      .findOne({
        user: new Types.ObjectId(userId),
        company: new Types.ObjectId(companyId),
        clockOutAt: { $exists: false },
      })
      .sort({ clockInAt: -1 })
      .exec();

    if (!entry) throw new NotFoundException('No open time entry found');

    entry.clockOutAt = new Date();
    entry.notes = data?.notes ?? entry.notes;
    const duration = Math.floor((entry.clockOutAt.getTime() - entry.clockInAt.getTime()) / 1000);
    entry.durationSec = duration >= 0 ? duration : 0;

    await entry.save();

    const populated = await this.timeEntryModel
      .findById(entry._id)
      .populate('user', 'firstName lastName email')
      .exec();

    return populated || entry;
  }

  async clockOutFor(
    requesterUserId: string,
    targetUserId: string,
    companyId: string,
    data: { notes?: string },
  ) {
    await this.ensureRequesterAndTargetInCompany(requesterUserId, targetUserId, companyId);
    return this.clockOut(targetUserId, companyId, data);
  }

  async findMy(userId: string, q: { companyId: string; from?: Date; to?: Date; page?: number; limit?: number }) {
    await this.ensureUserInCompany(userId, q.companyId);

    const page = Math.max(1, Number(q.page || 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit || 20)));

    const criteria: any = {
      user: new Types.ObjectId(userId),
      company: new Types.ObjectId(q.companyId),
    };
    if (q.from || q.to) {
      criteria.clockInAt = {};
      if (q.from) criteria.clockInAt.$gte = q.from;
      if (q.to) criteria.clockInAt.$lte = q.to;
    }

    const [items, total] = await Promise.all([
      this.timeEntryModel
        .find(criteria)
        .sort({ clockInAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'firstName lastName email')
        .exec(),
      this.timeEntryModel.countDocuments(criteria).exec(),
    ]);

    return { items, page, limit, total }; 
  }

  async findCompany(userId: string, q: { companyId: string; from?: Date; to?: Date; userId?: string; search?: string; page?: number; limit?: number }) {
    await this.ensureUserInCompany(userId, q.companyId);

    const page = Math.max(1, Number(q.page || 1));
    const limit = Math.min(200, Math.max(1, Number(q.limit || 50)));

    const criteria: any = {
      company: new Types.ObjectId(q.companyId),
    };
    
    // Filtre par userId si fourni
    if (q.userId) {
      criteria.user = new Types.ObjectId(q.userId);
    }
    
    // Filtre par dates
    if (q.from || q.to) {
      criteria.clockInAt = {};
      if (q.from) criteria.clockInAt.$gte = q.from;
      if (q.to) criteria.clockInAt.$lte = q.to;
    }

    // Construire la requête avec populate pour permettre la recherche textuelle
    let query = this.timeEntryModel.find(criteria).populate('user', 'firstName lastName email');
    
    console.log('🔍 Requête attendance - criteria:', criteria);
    console.log('🔍 Requête attendance - companyId:', q.companyId);
    
    let items: any[];
    let total: number;
    
    // Si recherche textuelle, on doit charger tous les items pour filtrer après populate
    if (q.search && q.search.trim()) {
      const allItems = await query.sort({ clockInAt: -1 }).exec();
      const searchLower = q.search.toLowerCase().trim();
      const filteredItems = allItems.filter((item: any) => {
        const user = item.user;
        if (!user) {
          // Logger l'item sans user pour diagnostic
          console.warn('⚠️ Event attendance sans user:', {
            id: item._id,
            clockInAt: item.clockInAt,
            userId: item.user
          });
          return false; // Exclure les events sans user
        }
        const firstName = (user.firstName || '').toLowerCase();
        const lastName = (user.lastName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
      total = filteredItems.length;
      items = filteredItems.slice((page - 1) * limit, page * limit);
    } else {
      // Sinon, on peut utiliser la pagination MongoDB directement
      const [itemsResult, totalResult] = await Promise.all([
        query
          .sort({ clockInAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .exec(),
        this.timeEntryModel.countDocuments(criteria).exec(),
      ]);
      items = itemsResult;
      total = totalResult;
    }
    
    console.log('📊 Résultats bruts:', items.length);
    if (items.length > 0) {
      console.log('👤 Premier item user data:', items[0].user);
      console.log('📝 Premier item user ID:', items[0].user);
      console.log('🆔 Premier item user ObjectId:', items[0].user?._id);
    }

    // Transformer les items pour s'assurer que user est un objet avec les bonnes propriétés
    const transformedItems = items.map((item: any) => {
      const plainItem = item.toObject ? item.toObject() : item;
      
      // S'assurer que user est un objet avec les propriétés nécessaires
      if (plainItem.user && typeof plainItem.user === 'object') {
        return {
          ...plainItem,
          user: {
            _id: plainItem.user._id,
            firstName: plainItem.user.firstName,
            lastName: plainItem.user.lastName,
            email: plainItem.user.email
          }
        };
      }
      
      return plainItem;
    });

    console.log('✅ Items transformés:', transformedItems.length);
    if (transformedItems.length > 0) {
      console.log('✅ Premier item transformé user:', transformedItems[0].user);
    }

    return { items: transformedItems, page, limit, total };
  }

  async report(requesterUserId: string, companyId: string, q: { userId?: string; from: Date; to: Date }) {
    // Ensure requester belongs to the company
    await this.ensureUserInCompany(requesterUserId, companyId);
    const match: any = {
      company: new Types.ObjectId(companyId),
    };
    if (q.userId) match.user = new Types.ObjectId(q.userId);
    if (q.from || q.to) {
      match.clockInAt = {};
      if (q.from) match.clockInAt.$gte = q.from;
      if (q.to) match.clockInAt.$lte = q.to;
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1 } }
          ]
        }
      },
      {
        $unwind: '$user'
      },
      {
        $addFields: {
          computedDuration: {
            $cond: [
              { $and: [{ $ifNull: ['$clockOutAt', false] }, { $ifNull: ['$clockInAt', false] }] },
              { $divide: [{ $subtract: ['$clockOutAt', '$clockInAt'] }, 1000] },
              '$durationSec',
            ],
          },
        },
      },
      {
        $group: {
          _id: { user: '$user', day: { $dateToString: { format: '%Y-%m-%d', date: '$clockInAt' } } },
          seconds: { $sum: { $ifNull: ['$computedDuration', 0] } },
        },
      },
      {
        $group: {
          _id: '$_id.user',
          days: { $push: { day: '$_id.day', seconds: '$seconds' } },
          totalSeconds: { $sum: '$seconds' },
        },
      },
    ];

    const result = await this.timeEntryModel.aggregate(pipeline).exec();
    return result;
  }

  private async saveDailyStats(
    companyId: string,
    date: Date,
    stats: {
      totalEmployees: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
      attendanceRate: number;
      attendanceDetails: Array<{
        userId: Types.ObjectId;
        clockInAt: Date;
        clockOutAt?: Date;
        isLate: boolean;
      }>;
    }
  ): Promise<void> {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Utiliser upsert pour créer ou mettre à jour les statistiques du jour
    await this.dailyStatsModel.updateOne(
      {
        company: new Types.ObjectId(companyId),
        date: dayStart
      },
      {
        $set: {
          totalEmployees: stats.totalEmployees,
          presentCount: stats.presentCount,
          absentCount: stats.absentCount,
          lateCount: stats.lateCount,
          attendanceRate: stats.attendanceRate,
          attendanceDetails: stats.attendanceDetails
        }
      },
      {
        upsert: true
      }
    );
  }

  async dashboard(requesterUserId: string, companyId: string) {
    await this.ensureUserInCompany(requesterUserId, companyId);

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    if (now.getDay() === 0) weekStart.setDate(weekStart.getDate() - 7);
    const weekStartAt = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
    const weekEndAt = dayEnd;

    const company = await this.companyModel
      .findById(companyId)
      .select('_id owner employees')
      .exec();
    if (!company) throw new NotFoundException('Company not found');

    const memberIds = new Set<string>();
    if (company.owner) memberIds.add((company.owner as any).toString());
    (company.employees || []).forEach((e: any) => {
      if (e) memberIds.add(e.toString());
    });
    const totalEmployees = memberIds.size;

    const weekEntries = await this.timeEntryModel
      .find({
        company: new Types.ObjectId(companyId),
        clockInAt: { $gte: weekStartAt, $lte: weekEndAt },
      })
      .sort({ clockInAt: -1 })
      .populate('user', 'firstName lastName email')
      .exec();

    const dayKey = (d: Date) => {
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    };

    const todayKey = dayKey(now);

    const presentByDay: Record<string, Set<string>> = {};
    const clockInByUserToday: Map<string, Date> = new Map();
    const attendanceDetailsToday: Array<{
      userId: Types.ObjectId;
      clockInAt: Date;
      clockOutAt?: Date;
      isLate: boolean;
    }> = [];

    for (const entry of weekEntries as any[]) {
      const uid = entry.user?._id?.toString?.() || entry.user?.toString?.() || entry.user?.id;
      if (!uid) continue;
      const key = dayKey(new Date(entry.clockInAt));
      if (!presentByDay[key]) presentByDay[key] = new Set();
      presentByDay[key].add(uid);

      if (key === todayKey) {
        const existing = clockInByUserToday.get(uid);
        const current = new Date(entry.clockInAt);
        if (!existing || current < existing) {
          clockInByUserToday.set(uid, current);
        }

        // Ajouter les détails de présence pour aujourd'hui
        const threshold = new Date(dayStart);
        threshold.setHours(9, 0, 0, 0);
        const isLate = current > threshold;
        
        attendanceDetailsToday.push({
          userId: new Types.ObjectId(uid),
          clockInAt: current,
          clockOutAt: entry.clockOutAt ? new Date(entry.clockOutAt) : undefined,
          isLate
        });
      }
    }

    const presentToday = presentByDay[todayKey]?.size || 0;
    const absentToday = Math.max(0, totalEmployees - presentToday);
    const tauxPresence = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    const threshold = new Date(dayStart);
    threshold.setHours(9, 0, 0, 0);
    const lateToday = Array.from(clockInByUserToday.values()).filter((t) => t > threshold).length;

    const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const weeklyAttendance = daysOfWeek.map((label, index) => {
      const d = new Date(weekStartAt);
      d.setDate(weekStartAt.getDate() + index);
      const key = dayKey(d);
      const presentCount = presentByDay[key]?.size || 0;
      const rate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;
      return { day: label, rate };
    });

    const todayEntries = weekEntries
      .filter((e: any) => {
        const t = new Date(e.clockInAt);
        return t >= dayStart && t <= dayEnd;
      })
      .slice(0, 4)
      .map((e: any) => ({
        id: e._id?.toString?.(),
        userId: e.user?._id?.toString?.() || e.user?.toString?.(),
        user: e.user,
        clockInAt: e.clockInAt,
        clockOutAt: e.clockOutAt,
        source: e.source,
        notes: e.notes,
      }));

    // Sauvegarder les statistiques journalières
    console.log('📊 Sauvegarde des statistiques journalières:', {
      companyId,
      date: now.toISOString().split('T')[0],
      stats: {
        totalEmployees,
        presentCount: presentToday,
        absentCount: absentToday,
        lateCount: lateToday,
        attendanceRate: tauxPresence,
        attendanceDetailsCount: attendanceDetailsToday.length
      }
    });

    await this.saveDailyStats(companyId, now, {
      totalEmployees,
      presentCount: presentToday,
      absentCount: absentToday,
      lateCount: lateToday,
      attendanceRate: tauxPresence,
      attendanceDetails: attendanceDetailsToday
    });

    console.log('✅ Statistiques journalières sauvegardées avec succès');

    return {
      companyId,
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      tauxPresence,
      weeklyAttendance,
      recentActivity: todayEntries,
    };
  }

  async getDailyStatsHistory(requesterUserId: string, companyId: string, from?: Date, to?: Date) {
    await this.ensureUserInCompany(requesterUserId, companyId);

    const criteria: any = {
      company: new Types.ObjectId(companyId)
    };

    if (from || to) {
      criteria.date = {};
      if (from) criteria.date.$gte = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      if (to) criteria.date.$lte = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
    }

    const history = await this.dailyStatsModel
      .find(criteria)
      .sort({ date: -1 })
      .limit(365) // Limiter à 1 an d'historique
      .exec();

    return history.map(stat => ({
      date: stat.date,
      totalEmployees: stat.totalEmployees,
      presentCount: stat.presentCount,
      absentCount: stat.absentCount,
      lateCount: stat.lateCount,
      attendanceRate: stat.attendanceRate,
      attendanceDetails: stat.attendanceDetails
    }));
  }
}
