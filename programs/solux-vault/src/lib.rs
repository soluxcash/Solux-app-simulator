use anchor_lang::prelude::*;

declare_id!("So1uxVau1tProgram11111111111111111111111111");

#[program]
pub mod solux_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.total_deposited = 0;
        vault.credit_ratio = 50; // 50% of collateral value as credit
        vault.bump = ctx.bumps.vault;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let vault = &mut ctx.accounts.vault;

        // Transfer SOL from user to vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, amount)?;

        // Update user account
        user_account.deposited_amount += amount;
        user_account.credit_line = calculate_credit_line(user_account.deposited_amount, vault.credit_ratio);
        
        // Update vault totals
        vault.total_deposited += amount;

        emit!(DepositEvent {
            user: ctx.accounts.user.key(),
            amount,
            total_deposited: user_account.deposited_amount,
            credit_line: user_account.credit_line,
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let vault = &mut ctx.accounts.vault;

        // Check if user has enough balance (considering used credit)
        let available = user_account.deposited_amount.saturating_sub(user_account.used_credit * 2);
        require!(amount <= available, VaultError::InsufficientBalance);

        // Transfer SOL from vault to user
        **ctx.accounts.vault_token_account.try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.user.try_borrow_mut_lamports()? += amount;

        // Update user account
        user_account.deposited_amount -= amount;
        user_account.credit_line = calculate_credit_line(user_account.deposited_amount, vault.credit_ratio);
        
        // Update vault totals
        vault.total_deposited -= amount;

        emit!(WithdrawEvent {
            user: ctx.accounts.user.key(),
            amount,
            remaining_deposited: user_account.deposited_amount,
            credit_line: user_account.credit_line,
        });

        Ok(())
    }

    pub fn use_credit(ctx: Context<UseCredit>, amount: u64) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;

        // Check available credit
        let available_credit = user_account.credit_line.saturating_sub(user_account.used_credit);
        require!(amount <= available_credit, VaultError::InsufficientCredit);

        user_account.used_credit += amount;

        emit!(CreditUsedEvent {
            user: ctx.accounts.user.key(),
            amount,
            total_used: user_account.used_credit,
            remaining_credit: user_account.credit_line - user_account.used_credit,
        });

        Ok(())
    }

    pub fn repay_credit(ctx: Context<RepayCredit>, amount: u64) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;

        require!(amount <= user_account.used_credit, VaultError::RepaymentExceedsDebt);

        user_account.used_credit -= amount;

        emit!(CreditRepaidEvent {
            user: ctx.accounts.user.key(),
            amount,
            remaining_debt: user_account.used_credit,
        });

        Ok(())
    }

    pub fn get_credit_line(ctx: Context<GetCreditLine>) -> Result<u64> {
        let user_account = &ctx.accounts.user_account;
        Ok(user_account.credit_line)
    }
}

fn calculate_credit_line(deposited: u64, ratio: u8) -> u64 {
    (deposited as u128 * ratio as u128 / 100) as u64
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserAccount::INIT_SPACE,
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: Vault token account for holding SOL
    #[account(mut, seeds = [b"vault_tokens"], bump)]
    pub vault_token_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    #[account(mut, seeds = [b"user", user.key().as_ref()], bump)]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: Vault token account for holding SOL
    #[account(mut, seeds = [b"vault_tokens"], bump)]
    pub vault_token_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UseCredit<'info> {
    #[account(mut, seeds = [b"user", user.key().as_ref()], bump)]
    pub user_account: Account<'info, UserAccount>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct RepayCredit<'info> {
    #[account(mut, seeds = [b"user", user.key().as_ref()], bump)]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetCreditLine<'info> {
    #[account(seeds = [b"user", user.key().as_ref()], bump)]
    pub user_account: Account<'info, UserAccount>,
    pub user: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub authority: Pubkey,
    pub total_deposited: u64,
    pub credit_ratio: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    pub owner: Pubkey,
    pub deposited_amount: u64,
    pub credit_line: u64,
    pub used_credit: u64,
    pub bump: u8,
}

#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub total_deposited: u64,
    pub credit_line: u64,
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub remaining_deposited: u64,
    pub credit_line: u64,
}

#[event]
pub struct CreditUsedEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub total_used: u64,
    pub remaining_credit: u64,
}

#[event]
pub struct CreditRepaidEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub remaining_debt: u64,
}

#[error_code]
pub enum VaultError {
    #[msg("Insufficient balance for withdrawal")]
    InsufficientBalance,
    #[msg("Insufficient credit available")]
    InsufficientCredit,
    #[msg("Repayment amount exceeds debt")]
    RepaymentExceedsDebt,
}
