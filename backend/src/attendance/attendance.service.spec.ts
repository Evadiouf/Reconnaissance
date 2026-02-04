import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { getModelToken } from '@nestjs/mongoose';
import { Attendance } from './schemas/attendance.schema';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceModel: any;
  let usersService: UsersService;
  let companiesService: CompaniesService;

  const mockAttendanceModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockUsersService = {
    findById: jest.fn(),
    hasPermissionInCompany: jest.fn(),
  };

  const mockCompaniesService = {
    findById: jest.fn(),
    hasAccess: jest.fn(),
  };

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: ['employee'],
    companyId: '507f1f77bcf86cd799439012',
  };

  const mockCompany = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Test Company',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: getModelToken(Attendance.name),
          useValue: mockAttendanceModel,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: CompaniesService,
          useValue: mockCompaniesService,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    attendanceModel = module.get(getModelToken(Attendance.name));
    usersService = module.get<UsersService>(UsersService);
    companiesService = module.get<CompaniesService>(CompaniesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('clockIn', () => {
    it('should successfully clock in a user', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockCompaniesService.findById.mockResolvedValue(mockCompany);
      mockAttendanceModel.findOne.mockResolvedValue(null); // No existing clock-in
      mockAttendanceModel.create.mockResolvedValue({
        userId: mockUser._id,
        companyId: mockCompany._id,
        clockIn: new Date(),
        status: 'clocked-in',
      });

      const result = await service.clockIn(mockUser._id, mockCompany._id, {});

      expect(result).toBeDefined();
      expect(mockAttendanceModel.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user already clocked in', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockCompaniesService.findById.mockResolvedValue(mockCompany);
      mockAttendanceModel.findOne.mockResolvedValue({
        userId: mockUser._id,
        clockIn: new Date(),
        clockOut: null,
      });

      await expect(
        service.clockIn(mockUser._id, mockCompany._id, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user has no access to company', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockCompaniesService.hasAccess.mockResolvedValue(false);

      await expect(
        service.clockIn(mockUser._id, mockCompany._id, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('clockOut', () => {
    it('should successfully clock out a user', async () => {
      const mockAttendance = {
        _id: '507f1f77bcf86cd799439013',
        userId: mockUser._id,
        companyId: mockCompany._id,
        clockIn: new Date(),
        clockOut: null,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUsersService.findById.mockResolvedValue(mockUser);
      mockCompaniesService.findById.mockResolvedValue(mockCompany);
      mockAttendanceModel.findOne.mockResolvedValue(mockAttendance);

      const result = await service.clockOut(mockUser._id, mockCompany._id, {});

      expect(result).toBeDefined();
      expect(mockAttendance.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user is not clocked in', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockCompaniesService.findById.mockResolvedValue(mockCompany);
      mockAttendanceModel.findOne.mockResolvedValue(null);

      await expect(
        service.clockOut(mockUser._id, mockCompany._id, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findMy', () => {
    it('should return user attendance records', async () => {
      const mockAttendances = [
        {
          userId: mockUser._id,
          clockIn: new Date(),
          clockOut: new Date(),
        },
      ];

      mockAttendanceModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockAttendances),
          }),
        }),
      });

      const result = await service.findMy(mockUser._id, {});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
