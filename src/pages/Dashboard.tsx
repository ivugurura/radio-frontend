import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  Inventory,
  People,
  AttachMoney,
} from '@mui/icons-material';

const Dashboard: React.FC = () => {
  const theme = useTheme();

  const stats = [
    {
      title: 'Total Products',
      value: '1,234',
      icon: <Inventory />,
      color: theme.palette.primary.main,
      change: '+12%',
    },
    {
      title: 'Active Users',
      value: '856',
      icon: <People />,
      color: theme.palette.success.main,
      change: '+8%',
    },
    {
      title: 'Total Sales',
      value: '$45,678',
      icon: <AttachMoney />,
      color: theme.palette.warning.main,
      change: '+15%',
    },
    {
      title: 'Revenue Growth',
      value: '23.5%',
      icon: <TrendingUp />,
      color: theme.palette.info.main,
      change: '+5%',
    },
  ];

  return (
    <Box>
      <Typography
        variant="h4"
        gutterBottom
        fontWeight={600}
        color="text.primary"
      >
        Dashboard Overview
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Welcome to your stock management system
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card
              elevation={2}
              sx={{
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography
                      variant="h4"
                      fontWeight={700}
                      color="text.primary"
                    >
                      {stat.value}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      {stat.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 1,
                        color: theme.palette.success.main,
                        fontWeight: 500,
                      }}
                    >
                      {stat.change} from last month
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: stat.color + '20',
                      borderRadius: '50%',
                      width: 60,
                      height: 60,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 3,
            }}
          >
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Chart and activity feed will be implemented here
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 3,
            }}
          >
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Quick Actions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Quick action buttons will be implemented here
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
