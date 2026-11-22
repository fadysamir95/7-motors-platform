import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async overview() {
    const [
      totalRevenueAgg,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalProducts,
      lowStockProducts,
      totalCustomers,
      pendingBookings,
      confirmedBookings,
      wholesaleRequests,
      pendingListings,
      publishedListings,
    ] = await Promise.all([
      this.prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'PAID' } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
      this.prisma.order.count({ where: { status: 'DELIVERED' } }),
      this.prisma.product.count(),
      this.prisma.inventory.count({ where: { stock: { lte: 5 } } }),
      this.prisma.customerProfile.count(),
      this.prisma.serviceBooking.count({ where: { status: 'PENDING_CONFIRMATION' } }),
      this.prisma.serviceBooking.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.wholesaleRequest.count(),
      this.prisma.carListing.count({ where: { status: 'PENDING_REVIEW' } }),
      this.prisma.carListing.count({ where: { status: 'PUBLISHED' } }),
    ]);
    return {
      totalRevenue: totalRevenueAgg._sum.total || 0,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalProducts,
      lowStockProducts,
      totalCustomers,
      pendingBookings,
      confirmedBookings,
      wholesaleRequests,
      pendingListings,
      publishedListings,
    };
  }
}
