import { faker } from '@faker-js/faker';
import { PrismaClient, Role, PaymentStatus, RideRequestStatus, ConnectedRideStatus, NotificationType, PaymentMethod, KosovoCity, Gender, ConversationType, User, RideRequest, ConnectedRide } from '@prisma/client';
import bcryptjs from "bcryptjs"

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.refreshToken.deleteMany();
  await prisma.reviews.deleteMany();
  await prisma.driverEarning.deleteMany();
  await prisma.passengerPayment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversations.deleteMany();
  await prisma.connectedRide.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.preferredDriver.deleteMany();
  await prisma.passengerRotation.deleteMany();
  await prisma.driverFixedTarifs.deleteMany();
  await prisma.userInformation.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const users: User[] = [];
  const cities = Object.values(KosovoCity);
  const genders = Object.values(Gender);

  const hashedPassword = await bcryptjs.hash('Laptophp1!.', 10);

  // Create 20 users (10 drivers, 10 passengers)
  for (let i = 0; i < 20; i++) {
    const isDriver = i < 10;
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        fullName: faker.person.fullName(),
        password: hashedPassword,
        role: isDriver ? Role.DRIVER : Role.PASSENGER,
        user_verified: faker.datatype.boolean(0.8), // 80% verified
        image: faker.image.avatar(),
        userInformation: {
          create: {
            ID_Card: [faker.image.url(), faker.image.url()],
            SelfiePhoto: faker.image.avatar(),
            address: faker.location.streetAddress(),
            yourDesiresForRide: faker.lorem.sentence(),
            city: faker.helpers.arrayElement(cities),
            gender: faker.helpers.arrayElement(genders),
          },
        },
      },
    });
    users.push(user);
    console.log(`Created user: ${user.fullName} (${user.role})`);
  }

  const drivers = users.filter(user => user.role === Role.DRIVER);
  const passengers = users.filter(user => user.role === Role.PASSENGER);

  // Create driver fixed tariffs
  for (const driver of drivers) {
    for (let i = 0; i < 3; i++) {
      await prisma.driverFixedTarifs.create({
        data: {
          user: { connect: { id: driver.id } },
          fixedTarifTitle: faker.lorem.words(3),
          city: faker.helpers.arrayElement(cities),
          locationArea: faker.location.street(),
          price: faker.number.float({ min: 5, max: 50 }),
          description: faker.lorem.sentence(),
        },
      });
    }
  }
  console.log('Created driver fixed tariffs');

  // Create ride requests
  const rideRequests: RideRequest[] = [];
  for (const passenger of passengers) {
    for (let i = 0; i < 3; i++) {
      const rideRequest = await prisma.rideRequest.create({
        data: {
          passenger: { connect: { id: passenger.id } },
          price: faker.number.float({ min: 10, max: 100 }),
          distanceCalculatedPriceRide: faker.datatype.boolean(),
          distanceKm: faker.number.float({ min: 5, max: 100 }),
          fromAddress: faker.location.streetAddress(),
          toAddress: faker.location.streetAddress(),
          isUrgent: faker.datatype.boolean(0.2), // 20% urgent
          status: faker.helpers.arrayElement([
            RideRequestStatus.WAITING,
            RideRequestStatus.COMPLETED,
            RideRequestStatus.CANCELLED
          ]),
        },
      });
      rideRequests.push(rideRequest);
    }
  }
  console.log('Created ride requests');

  // Create connected rides
  const connectedRides: ConnectedRide[] = [];
  for (let i = 0; i < 15; i++) {
    const driver = faker.helpers.arrayElement(drivers);
    const passenger = faker.helpers.arrayElement(passengers);
    const rideRequest = rideRequests[i % rideRequests.length];

    const connectedRide = await prisma.connectedRide.create({
      data: {
        driver: { connect: { id: driver.id } },
        passenger: { connect: { id: passenger.id } },
        rideRequest: { connect: { id: rideRequest.id } },
        status: faker.helpers.arrayElement([
          ConnectedRideStatus.WAITING,
          ConnectedRideStatus.DRIVING,
          ConnectedRideStatus.COMPLETED
        ]),
      },
    });
    connectedRides.push(connectedRide);
  }
  console.log('Created connected rides');

  // Create driver earnings and passenger payments for completed rides
  const completedRides = connectedRides.filter(ride => ride.status === ConnectedRideStatus.COMPLETED);
  for (const ride of completedRides) {
    const amount = faker.number.float({ min: 15, max: 120 });
    const fee = amount * 0.15; // 15% fee
    const netEarnings = amount - fee;

    // Driver earning
    await prisma.driverEarning.create({
      data: {
        driver: { connect: { id: ride.driverId } },
        ride: { connect: { id: ride.id } },
        amount,
        fee,
        netEarnings,
        status: PaymentStatus.PAID,
        paymentDate: faker.date.recent(),
      },
    });

    // Passenger payment
    await prisma.passengerPayment.create({
      data: {
        passenger: { connect: { id: ride.passengerId } },
        ride: { connect: { id: ride.id } },
        amount,
        surcharge: faker.number.float({ min: 0, max: 10 }),
        totalPaid: amount + (faker.number.float({ min: 0, max: 10 })),
        paymentMethod: faker.helpers.arrayElement([
          PaymentMethod.CASH,
          PaymentMethod.CARD,
          PaymentMethod.WALLET
        ]),
        status: PaymentStatus.PAID,
        paidAt: faker.date.recent(),
      },
    });

    // Reviews for completed rides
    await prisma.reviews.create({
      data: {
        passenger: { connect: { id: ride.passengerId } },
        driver: { connect: { id: ride.driverId } },
        connectedRide: { connect: { id: ride.id } },
        comment: faker.lorem.sentence(),
        rating: faker.number.int({ min: 1, max: 5 }),
      },
    });
  }
  console.log('Created earnings, payments, and reviews');

  // Create conversations and messages
  for (let i = 0; i < 10; i++) {
    const driver = faker.helpers.arrayElement(drivers);
    const passenger = faker.helpers.arrayElement(passengers);
    const rideRequest = faker.helpers.arrayElement(rideRequests);

    const conversation = await prisma.conversations.create({
      data: {
        driver: { connect: { id: driver.id } },
        passenger: { connect: { id: passenger.id } },
        rideRequest: { connect: { id: rideRequest.id } },
        type: ConversationType.RIDE_RELATED,
        subject: faker.lorem.sentence(),
        isResolved: faker.datatype.boolean(0.3),
        lastMessageAt: faker.date.recent(),
      },
    });

    // Create 3-5 messages per conversation
    const messageCount = faker.number.int({ min: 3, max: 5 });
    for (let j = 0; j < messageCount; j++) {
      const isDriverMessage = j % 2 === 0;
      await prisma.message.create({
        data: {
          conversation: { connect: { id: conversation.id } },
          sender: { connect: { id: isDriverMessage ? driver.id : passenger.id } },
          senderRole: isDriverMessage ? Role.DRIVER : Role.PASSENGER,
          content: faker.lorem.sentence(),
          mediaUrls: faker.datatype.boolean(0.2) ? [faker.image.url()] : [],
          priceOffer: faker.datatype.boolean(0.3) ? faker.number.float({ min: 10, max: 100 }) : null,
          isRead: faker.datatype.boolean(0.7),
        },
      });
    }
  }
  console.log('Created conversations and messages');

  // Create notifications
  for (const user of users) {
    for (let i = 0; i < 5; i++) {
      await prisma.notification.create({
        data: {
          user: { connect: { id: user.id } },
          title: faker.lorem.words(3),
          message: faker.lorem.sentence(),
          type: faker.helpers.arrayElement([
            NotificationType.MESSAGE,
            NotificationType.SYSTEM_ALERT,
            NotificationType.PAYMENT,
            NotificationType.RIDE_UPDATE,
            NotificationType.REVIEW,
            NotificationType.PROMOTIONAL
          ]),
          read: faker.datatype.boolean(0.4),
          metadata: JSON.stringify({
            modalAction: true,
            notificationSender: null,
            navigateAction: {connectedRide: connectedRides[0].id},
          }),
        },
      });
    }
  }
  console.log('Created notifications');

  // Create preferred drivers
  for (const passenger of passengers) {
    const preferredDrivers = faker.helpers.arrayElements(drivers, 2);
    for (const driver of preferredDrivers) {
      await prisma.preferredDriver.create({
        data: {
          driver: { connect: { id: driver.id } },
          passenger: { connect: { id: passenger.id } },
          whyPrefered: faker.lorem.sentence(),
        },
      });
    }
  }
  console.log('Created preferred drivers');

  // Create passenger rotations
  for (const passenger of passengers) {
    await prisma.passengerRotation.create({
      data: {
        user: { connect: { id: passenger.id } },
        fromAddress: faker.location.streetAddress(),
        toAddress: faker.location.streetAddress(),
        days: JSON.stringify(['MON', 'WED', 'FRI']),
        time: faker.date.future(),
      },
    });
  }
  console.log('Created passenger rotations');

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });